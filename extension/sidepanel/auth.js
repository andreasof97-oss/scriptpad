// ScriptPad — Auth Module (Supabase + Subscription)

const Auth = (() => {
  let client = null;
  let currentUser = null;
  let currentPlan = 'free';
  let onAuthChange = null;

  function init(callback) {
    onAuthChange = callback;
    client = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
      auth: {
        storage: {
          // Use chrome.storage.local for token persistence (works in extensions)
          getItem: (key) => new Promise((resolve) => {
            chrome.storage.local.get([key], (data) => resolve(data[key] || null));
          }),
          setItem: (key, value) => new Promise((resolve) => {
            chrome.storage.local.set({ [key]: value }, resolve);
          }),
          removeItem: (key) => new Promise((resolve) => {
            chrome.storage.local.remove([key], resolve);
          })
        },
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
      }
    });

    // Listen for auth state changes
    client.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        currentUser = { email: session.user.email, id: session.user.id };
        fetchPlan(session.user.id);
      } else {
        currentUser = null;
        currentPlan = 'free';
      }
      notifyChange();
    });

    // Check existing session
    client.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        currentUser = { email: session.user.email, id: session.user.id };
        fetchPlan(session.user.id);
      }
      notifyChange();
    });
  }

  async function fetchPlan(userId) {
    try {
      const { data, error } = await client
        .from('subscriptions')
        .select('plan, status')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (data && data.plan === 'pro') {
        currentPlan = 'pro';
      } else {
        currentPlan = 'free';
      }
    } catch (err) {
      console.warn('[ScriptPad] Failed to fetch plan:', err);
      currentPlan = 'free';
    }
    notifyChange();
  }

  function notifyChange() {
    if (onAuthChange) {
      onAuthChange({ user: currentUser, plan: currentPlan });
    }
  }

  async function signIn(email, password) {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signUp(email, password) {
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    const { error } = await client.auth.signOut();
    if (error) throw error;
    currentUser = null;
    currentPlan = 'free';
    notifyChange();
  }

  async function resetPassword(email) {
    // Send the reset link to the page that actually handles setting a new
    // password (docs/index.html on GitHub Pages). Without this, the link uses
    // Supabase's default Site URL and can land on a page with no reset form.
    const { data, error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://andreasof97-oss.github.io/scriptpad/'
    });
    if (error) throw error;
    return data;
  }

  async function changePassword(newPassword) {
    const { data, error } = await client.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return data;
  }

  function getUser() {
    return currentUser;
  }

  function getClient() {
    return client;
  }

  // The current user's access token, used to authenticate calls to our
  // edge functions (e.g. the AI Assistant). Null when signed out.
  async function getAccessToken() {
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data?.session?.access_token || null;
  }

  function getPlan() {
    return currentPlan;
  }

  function isPro() {
    return currentPlan === 'pro';
  }

  // Refresh plan from database (call after webhook processes payment)
  async function refreshPlan() {
    if (currentUser) {
      await fetchPlan(currentUser.id);
    }
  }

  return {
    init,
    signIn,
    signUp,
    signOut,
    resetPassword,
    changePassword,
    getUser,
    getClient,
    getAccessToken,
    getPlan,
    isPro,
    refreshPlan
  };
})();
