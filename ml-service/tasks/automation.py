# ============================================================================
# FILE ADDRESS: ml-service/tasks/automation.py
# ============================================================================
# EXPLANATION:
# This script handles automated business workflows triggered by the nightly 
# Vercel Cron job. It executes three critical business automation tasks:
#
# 1. Fraud Prevention (Human Review Queue):
#    Flags suspicious orders for admin review instead of auto-cancelling.
#
# 2. Inventory (Automated Purchase Orders):
#    Identifies critical stock items and generates a PDF Purchase Order.
#
# 3. Retention (Causal Inference Holdout Group):
#    Finds "High Risk" customers and sends them a 20% discount code.
#    CRITICAL FIX: We now intentionally hold out 10% of these customers 
#    (Control Group) and do NOT send them the email. Both groups are logged 
#    in the `retention_email_log` table. This enables Difference-in-Differences 
#    (DiD) causal inference to measure the TRUE ROI of the email campaign, 
#    isolating the impact of the email from natural customer recovery.
# ============================================================================

import logging
import os
import random
from datetime import datetime
import resend
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib import colors
from psycopg2.extras import RealDictCursor

logger = logging.getLogger("bushal-ml.automation")

# Configure Resend
resend.api_key = os.getenv("RESEND_API_KEY")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")

def run_business_automation():
    """
    Executes the business automation pipeline:
    1. Fraud Detection: Flag suspicious orders for human review.
    2. Inventory: Generate PDF Purchase Orders for critical stock items.
    3. Retention: Send discount emails to 'High Risk' churned customers 
       with a 10% holdout group for causal inference (DiD).
    """
    logger.info("🤖 Starting Business Automation Pipeline...")
    conn = None
    results = {
        "fraud_flagged": 0,
        "pos_generated": 0,
        "retention_emails_sent": 0,
        "retention_holdout_size": 0
    }

    try:
        from main import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # ─── TASK 1: Fraud Prevention (Human Review Queue) ───────────────
        logger.info("🛡️ [1/3] Flagging suspicious orders for human review...")
        
        cursor.execute("""
            SELECT customer_id, segment, confidence_score
            FROM customer_segments
            WHERE (segment = 'Fake Orders' AND confidence_score > 0.75)
               OR (segment = 'High Risk' AND confidence_score > 0.85)
        """)
        suspicious_users = cursor.fetchall()
        
        flagged_count = 0
        for user in suspicious_users:
            cursor.execute("""
                SELECT id, total FROM orders
                WHERE user_id = %s 
                  AND status = 'pending' 
                  AND delivery_status = 'order_placed'
                  AND created_at > NOW() - INTERVAL '48 hours'
            """, (user['customer_id'],))
            orders_to_flag = cursor.fetchall()
            
            for order in orders_to_flag:
                cursor.execute("""
                    INSERT INTO fraud_review_queue (order_id, customer_id, reason, confidence_proxy, status)
                    VALUES (%s, %s, %s, %s, 'pending')
                    ON CONFLICT (order_id) DO NOTHING
                """, (
                    order['id'], 
                    user['customer_id'], 
                    f"Customer flagged as {user['segment']} by K-Means clustering",
                    user['confidence_score']
                ))
                
                if cursor.rowcount > 0:
                    flagged_count += 1
                    logger.info(f"   🚩 Flagged order {order['id']} for review")
        
        results["fraud_flagged"] = flagged_count
        conn.commit()

        # ─── TASK 2: Automated Purchase Orders (PDF Generation) ──────────
        logger.info("📦 [2/3] Generating Purchase Orders for critical stock...")
        
        cursor.execute("""
            SELECT id, name, cost_price, stock_quantity
            FROM products
            WHERE in_stock = true AND stock_quantity <= 5 AND is_deleted = false
            LIMIT 20
        """)
        critical_items = cursor.fetchall()
        
        if critical_items:
            os.makedirs("generated_reports", exist_ok=True)
            filename = f"generated_reports/PO_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            doc = SimpleDocTemplate(filename, pagesize=letter)
            elements = []
            
            elements.append(Paragraph("URGENT PURCHASE ORDER", style={'fontSize': 16, 'bold': True}))
            elements.append(Spacer(10, 10))
            elements.append(Paragraph(f"Date: {datetime.now().strftime('%Y-%m-%d')}"))
            elements.append(Spacer(10, 10))
            
            data = [['Product Name', 'Current Stock', 'Est. Unit Cost']]
            for item in critical_items:
                cost = float(item['cost_price'] or 0)
                data.append([item['name'], str(item['stock_quantity']), f"৳{cost:.2f}"])
            
            t = Table(data)
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            elements.append(t)
            doc.build(elements)
            
            results["pos_generated"] = 1
            logger.info(f"   📄 Generated PO PDF: {filename}")

        # ─── TASK 3: Retention Emails (Causal Inference Holdout) ─────────
        logger.info("📧 [3/3] Processing retention emails with 10% Causal Holdout...")
        
        if not resend.api_key:
            logger.warning("   ⚠️ RESEND_API_KEY missing. Skipping emails.")
        else:
            # Find High Risk customers with Recency > 60 days
            cursor.execute("""
                SELECT cs.customer_id, p.email, p.full_name, cs.recency
                FROM customer_segments cs
                JOIN profiles p ON p.id = cs.customer_id
                WHERE cs.segment = 'High Risk' 
                  AND cs.recency > 60 
                  AND p.email IS NOT NULL
            """)
            churn_risk_customers = cursor.fetchall()
            
            if not churn_risk_customers:
                logger.info("   ⏭️ No High Risk customers found for retention.")
            else:
                # 🔥 CAUSAL INFERENCE: Randomly shuffle and split into 90% Treatment / 10% Control
                random.shuffle(churn_risk_customers)
                holdout_size = max(1, int(len(churn_risk_customers) * 0.10)) # 10% holdout
                
                holdout_group = churn_risk_customers[:holdout_size]
                treatment_group = churn_risk_customers[holdout_size:]
                
                logger.info(f"   🧪 Splitting {len(churn_risk_customers)} users: {len(treatment_group)} Treatment, {len(holdout_group)} Control (Holdout)")
                
                sent_count = 0
                
                # 1. Log the HOLDOUT group (Control) - NO EMAIL SENT
                # This establishes the baseline for Difference-in-Differences (DiD)
                for customer in holdout_group:
                    cursor.execute("""
                        INSERT INTO public.retention_email_log (user_id, segment, is_holdout, discount_code)
                        VALUES (%s, %s, true, null)
                    """, (customer['customer_id'], 'High Risk'))
                
                # 2. Log the TREATMENT group and SEND EMAILS
                for customer in treatment_group:
                    code = f"COMEBACK{customer['customer_id'][:4].upper()}"
                    
                    # Log to DB with the discount code used
                    cursor.execute("""
                        INSERT INTO public.retention_email_log (user_id, segment, is_holdout, discount_code)
                        VALUES (%s, %s, false, %s)
                    """, (customer['customer_id'], 'High Risk', code))
                    
                    try:
                        resend.Emails.send({
                            "from": "Bushal <onboarding@resend.dev>",
                            "to": [customer['email']],
                            "subject": "We miss you! Here's 20% off your next order.",
                            "html": f"""
                            <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
                                <h2 style="color: #1A362D;">Hi {customer['full_name'] or 'there'},</h2>
                                <p style="color: #4B5563; line-height: 1.6;">
                                    It's been a while! We noticed you haven't shopped with us in <strong>{customer['recency']} days</strong>.
                                </p>
                                <p style="color: #4B5563; line-height: 1.6;">
                                    We'd love to see you back. Use code <strong style="color: #B87333; font-size: 1.2em;">{code}</strong> for 20% off your next order.
                                </p>
                                <a href="https://bushal.vercel.app/dashboard" 
                                   style="display: inline-block; background: #B87333; color: white; padding: 12px 24px; 
                                          text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 16px;">
                                    Shop Now
                                </a>
                                <p style="color: #9CA3AF; font-size: 12px; margin-top: 32px;">— The Bushal Team</p>
                            </div>
                            """
                        })
                        sent_count += 1
                    except Exception as e:
                        logger.error(f"   ❌ Failed to email {customer['email']}: {e}")
                
                results["retention_emails_sent"] = sent_count
                results["retention_holdout_size"] = len(holdout_group)
                logger.info(f"   ✅ Sent {sent_count} emails. {len(holdout_group)} users held out for causal baseline.")
                
                conn.commit()

        logger.info("✅ Business Automation Pipeline Completed.")
        return results

    except Exception as e:
        logger.error(f"❌ Automation pipeline failed: {e}", exc_info=True)
        if conn:
            conn.rollback()
        return {"status": "error", "error": str(e)}
    finally:
        if conn:
            conn.close()