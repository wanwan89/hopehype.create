import { useState } from 'react'
import { Turnstile } from '@marsidev/react-turnstile'
import { supabase } from '../lib/supabaseClient' // Pastikan path ini benar mengarah ke file config Supabase-mu

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSignUp = async (e) => {
    e.preventDefault()

    if (!captchaToken) {
      setMessage("Tolong selesaikan verifikasi keamanan (CAPTCHA) terlebih dahulu ya!")
      return
    }

    setLoading(true)
    setMessage('') // Reset pesan sebelumnya

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        captchaToken, // Wajib disertakan agar diverifikasi oleh Supabase
      },
    })

    setLoading(false)

    if (error) {
      setMessage(`Oops, gagal: ${error.message}`)
    } else {
      setMessage("Sign up berhasil! Cek email kamu untuk verifikasi.")
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-pink-50 p-4">
      {/* Container Form dengan style playful & vibrant */}
      <div className="bg-white p-8 rounded-3xl shadow-[8px_8px_0px_0px_rgba(244,114,182,0.3)] border-2 border-pink-200 max-w-sm w-full">
        
        <h2 className="text-2xl font-bold text-center text-pink-500 mb-6 tracking-wide">
          Join Hope Hype!
        </h2>

        {/* Notifikasi Pesan Error / Sukses */}
        {message && (
          <div className="mb-4 p-3 rounded-xl bg-purple-100 text-purple-700 text-sm font-medium text-center border border-purple-200">
            {message}
          </div>
        )}

        <form onSubmit={handleSignUp} className="flex flex-col gap-4">
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
            <input 
              type="email" 
              placeholder="Masukkan email kamu..." 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border-2 border-gray-200 focus:border-pink-400 focus:ring-0 outline-none transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              placeholder="Buat password yang kuat..." 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border-2 border-gray-200 focus:border-pink-400 focus:ring-0 outline-none transition-colors"
              required
            />
          </div>

          <div className="flex justify-center my-2">
            {/* Widget Turnstile */}
            <Turnstile
              siteKey="0x4AAAAAAC8RAExeHvAJu5Xt"
              onSuccess={(token) => setCaptchaToken(token)}
              options={{ theme: 'light' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-pink-400 to-purple-400 text-white font-bold rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? 'Memproses...' : 'Daftar Sekarang'}
          </button>

        </form>
      </div>
    </div>
  )
}
