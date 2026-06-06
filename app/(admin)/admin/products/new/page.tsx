// app/(admin)/admin/products/new/page.tsx

import ProductForm from "@/app/components/product/ProductForm";



export default function NewProductPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Add New Product</h1>
      <div className="bg-white rounded-xl shadow p-8">
        <ProductForm mode="create" />
      </div>
    </div>
  )
}