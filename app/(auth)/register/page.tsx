// app/(auth)/register/page.tsx


import RegisterForm from '@/app/components/auth/RegisterForm'

import Link from 'next/link'

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-orange-500 tracking-tight">
            Sagitus
          </h1>
          <p className="mt-2 text-gray-500">Create your account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-8">
          <RegisterForm />
          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-orange-500 font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}