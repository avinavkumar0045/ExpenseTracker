import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Custom auth wrapper that uses only the users table
 * No dependency on Supabase Auth - all credentials stored in users table
 */
export const auth = {
  /**
   * Login using users table only
   * Validates email and login_password against users table
   */
  async login(email, login_password) {
    // Fetch user from users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()
    
    if (userError || !user) {
      throw new Error('Invalid email or password')
    }
    
    // Validate password
    if (user.login_password !== login_password) {
      throw new Error('Invalid email or password')
    }
    
    return { user, session: null }
  },

  /**
   * Register new user - only uses users table
   * Initializes personal_wallet with ₹100,000 (like paper trading account)
   */
  async register(userData) {
    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', userData.email)
      .single()
    
    if (existingUser) {
      throw new Error('Email already registered')
    }
    
    // Generate a simple UUID-like ID for user_id
    const user_id = crypto.randomUUID()
    
    // Insert into users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert([{
        user_id: user_id,
        name: userData.name,
        email: userData.email,
        login_password: userData.login_password,
        transaction_password: userData.transaction_password,
        dob: userData.dob,
        contact: userData.contact
      }])
      .select()
      .single()
    
    if (userError) throw userError
    
    // Initialize personal wallet with ₹100,000 (paper trading default)
    await supabase.from('personal_wallet').insert([{
      user_id: user_id,
      balance: 100000
    }])
    
    return { user, session: null }
  },

  /**
   * Logout - just clear session storage
   */
  async logout() {
    sessionStorage.clear()
  },

  /**
   * Get current user from session storage
   */
  getUser() {
    const user = sessionStorage.getItem('user')
    return user ? JSON.parse(user) : null
  },

  /**
   * Set user in session storage
   */
  setUser(user) {
    sessionStorage.setItem('user', JSON.stringify(user))
  },

  /**
   * Verify transaction password before financial operations
   * Returns true if password matches
   */
  async verifyTransactionPassword(userId, enteredPassword) {
    const { data, error } = await supabase
      .from('users')
      .select('transaction_password')
      .eq('user_id', userId)
      .single()
    
    if (error || !data) return false
    return data.transaction_password === enteredPassword
  }
}
