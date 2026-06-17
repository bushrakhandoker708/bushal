# ml-service/tasks/automation.py
# Auto-Canceling Fraud: It checks the customer_segments table for users flagged as "Fake Orders" (with high confidence) and automatically cancels their pending orders to prevent shipping losses.
# Generating Purchase Orders: It identifies critical stock items (low stock) and uses reportlab to generate a PDF Purchase Order (PO) for the admin.
# Retention Campaigns: It finds "High Risk" customers who haven't bought in 60+ days and sends them a personalized discount code via Resend to prevent churn

import logging
import os
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
    1. Fraud Detection: Auto-cancel orders from 'Fake Orders' segment.
    2. Inventory: Generate PDF Purchase Orders for critical stock items.
    3. Retention: Send discount emails to 'High Risk' churned customers.
    """
    logger.info("🤖 Starting Business Automation Pipeline...")
    conn = None
    results = {
        "fraud_cancelled": 0,
        "pos_generated": 0,
        "retention_emails_sent": 0
    }

    try:
        from main import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # ─── TASK 1: Fraud Prevention (Auto-Cancel) ──────────────────────────
        logger.info("🛡️ [1/3] Checking for fraudulent pending orders...")
        
        # Find users flagged as 'Fake Orders' with high confidence (>85%)
        cursor.execute("""
            SELECT customer_id, confidence_score 
            FROM customer_segments 
            WHERE segment = 'Fake Orders' AND confidence_score > 0.85
        """)
        fake_users = cursor.fetchall()
        
        cancelled_count = 0
        for user in fake_users:
            # Find their recent pending orders (last 24h)
            cursor.execute("""
                SELECT id FROM orders 
                WHERE user_id = %s AND status = 'pending' 
                AND created_at > NOW() - INTERVAL '24 hours'
            """, (user['customer_id'],))
            orders_to_cancel = cursor.fetchall()
            
            for order in orders_to_cancel:
                cursor.execute("""
                    UPDATE orders 
                    SET status = 'cancelled', delivery_status = 'cancelled'
                    WHERE id = %s
                """, (order['id'],))
                cancelled_count += 1
                logger.info(f"   🚫 Auto-cancelled order {order['id']} for user {user['customer_id']}")
        
        results["fraud_cancelled"] = cancelled_count
        conn.commit() # Commit cancellations immediately

        # ── TASK 2: Automated Purchase Orders (PDF Generation) ──────────────
        logger.info("📦 [2/3] Generating Purchase Orders for critical stock...")
        
        # Identify critical items (Stock <= 5 and In Stock)
        # Note: In a full system, this would query the 'restock_alerts' table populated by the ML engine.
        cursor.execute("""
            SELECT id, name, cost_price, stock_quantity 
            FROM products 
            WHERE in_stock = true AND stock_quantity <= 5 AND is_deleted = false
            LIMIT 20
        """)
        critical_items = cursor.fetchall()
        
        if critical_items:
            # Create directory if it doesn't exist
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
                data.append([item['name'], str(item['stock_quantity']), f"${cost:.2f}"])
            
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

        # ─── TASK 3: Retention Emails (Churn Prevention) ─────────────────────
        logger.info("📧 [3/3] Sending retention emails to High Risk customers...")
        
        if not resend.api_key:
            logger.warning("   ⚠️ RESEND_API_KEY missing. Skipping emails.")
        else:
            # Find High Risk customers with Recency > 60 days
            cursor.execute("""
                SELECT cs.customer_id, p.email, p.full_name, cs.recency
                FROM customer_segments cs
                JOIN profiles p ON p.id = cs.customer_id
                WHERE cs.segment = 'High Risk' AND cs.recency > 60 AND p.email IS NOT NULL
                LIMIT 50
            """)
            churn_risk_customers = cursor.fetchall()
            
            sent_count = 0
            for customer in churn_risk_customers:
                try:
                    # Generate a unique-ish code
                    code = f"COMEBACK{customer['customer_id'][:4].upper()}"
                    
                    resend.Emails.send({
                        "from": "Bushal <onboarding@resend.dev>", # Use sandbox address
                        "to": [customer['email']],
                        "subject": "We miss you! Here's 20% off your next order.",
                        "html": f"""
                        <div style="font-family: sans-serif; padding: 20px;">
                            <p>Hi {customer['full_name'] or 'there'},</p>
                            <p>It's been a while! We noticed you haven't shopped with us in {customer['recency']} days.</p>
                            <p>Use code <strong style="color: #ea580c;">{code}</strong> for 20% off your next order.</p>
                            <p>— The Bushal Team</p>
                        </div>
                        """
                    })
                    sent_count += 1
                except Exception as e:
                    logger.error(f"   ❌ Failed to email {customer['email']}: {e}")
                    
            results["retention_emails_sent"] = sent_count
            logger.info(f"   ✅ Sent {sent_count} retention emails.")

    except Exception as e:
        logger.error(f"❌ Automation pipeline failed: {e}", exc_info=True)
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

    logger.info("✅ Business Automation Pipeline Completed.")
    return results