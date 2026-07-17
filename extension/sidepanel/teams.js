// ScriptPad — Teams Module (shared script libraries + push updates)
// Depends on Auth module exposing a Supabase client via Auth.getClient()

const Teams = (() => {
  let client = null;

  function init(supabaseClient) {
    client = supabaseClient;
  }

  function ready() {
    return !!client && !!Auth.getUser();
  }

  // Short, friendly invite code like "SP-7K3QX"
  function genInviteCode() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 5; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return 'SP-' + out;
  }

  // ---- Team lifecycle ----

  async function createTeam(name) {
    const user = Auth.getUser();
    if (!user) throw new Error('not_signed_in');
    const invite_code = genInviteCode();
    const { data: team, error } = await client
      .from('teams')
      .insert({ name, invite_code, owner_id: user.id })
      .select()
      .single();
    if (error) throw error;

    // Add creator as manager
    const { error: mErr } = await client
      .from('team_members')
      .insert({ team_id: team.id, user_id: user.id, email: user.email, role: 'manager' });
    if (mErr) throw mErr;

    return team;
  }

  async function joinTeam(inviteCode) {
    const user = Auth.getUser();
    if (!user) throw new Error('not_signed_in');
    const code = (inviteCode || '').trim().toUpperCase();

    const { data: team, error } = await client
      .from('teams')
      .select('*')
      .eq('invite_code', code)
      .maybeSingle();
    if (error) throw error;
    if (!team) throw new Error('bad_code');

    const { error: jErr } = await client
      .from('team_members')
      .insert({ team_id: team.id, user_id: user.id, email: user.email, role: 'agent' });
    // Ignore duplicate (already a member)
    if (jErr && !String(jErr.message || '').includes('duplicate')) throw jErr;

    return team;
  }

  async function leaveTeam(teamId) {
    const user = Auth.getUser();
    if (!user) throw new Error('not_signed_in');
    const { error } = await client
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', user.id);
    if (error) throw error;
  }

  // Get the teams the current user belongs to (with their role)
  async function getMyTeams() {
    const user = Auth.getUser();
    if (!user) return [];
    const { data, error } = await client
      .from('team_members')
      .select('role, team_id, teams(id, name, invite_code, owner_id)')
      .eq('user_id', user.id);
    if (error) { console.warn('[Teams] getMyTeams', error); return []; }
    return (data || [])
      .filter(r => r.teams)
      .map(r => ({ ...r.teams, role: r.role }));
  }

  async function getMembers(teamId) {
    const { data, error } = await client
      .from('team_members')
      .select('user_id, email, role, joined_at')
      .eq('team_id', teamId)
      .order('joined_at', { ascending: true });
    if (error) { console.warn('[Teams] getMembers', error); return []; }
    return data || [];
  }

  async function setMemberRole(teamId, userId, role) {
    const { error } = await client
      .from('team_members')
      .update({ role })
      .eq('team_id', teamId)
      .eq('user_id', userId);
    if (error) throw error;
  }

  async function removeMember(teamId, userId) {
    const { error } = await client
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId);
    if (error) throw error;
  }

  // ---- Shared scripts (the "library") ----

  // Manager pushes a local script into the team library.
  // If a shared copy with the same title already exists in this team, UPDATE it
  // (true "push updates") instead of creating a duplicate.
  async function pushScript(teamId, script) {
    const user = Auth.getUser();
    const row = {
      team_id: teamId,
      title: script.title || '',
      body: script.body || '',
      tags: script.tags || [],
      type: script.type || 'standard',
      nodes: script.nodes || [],
      start_node_id: script.startNodeId || null,
      updated_by: user ? user.id : null,
      updated_at: new Date().toISOString()
    };

    // Look for an existing shared script with the same title in this team
    const { data: existing } = await client
      .from('shared_scripts')
      .select('id')
      .eq('team_id', teamId)
      .eq('title', row.title)
      .maybeSingle();

    if (existing && existing.id) {
      const { data, error } = await client
        .from('shared_scripts')
        .update(row)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return { ...data, _updated: true };
    }

    const { data, error } = await client
      .from('shared_scripts')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return { ...data, _updated: false };
  }

  async function updateSharedScript(sharedId, script) {
    const user = Auth.getUser();
    const { data, error } = await client
      .from('shared_scripts')
      .update({
        title: script.title || '',
        body: script.body || '',
        tags: script.tags || [],
        type: script.type || 'standard',
        nodes: script.nodes || [],
        start_node_id: script.startNodeId || null,
        updated_by: user ? user.id : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', sharedId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function deleteSharedScript(sharedId) {
    const { error } = await client
      .from('shared_scripts')
      .delete()
      .eq('id', sharedId);
    if (error) throw error;
  }

  // Everyone pulls their team's shared library
  async function getSharedScripts(teamId) {
    const { data, error } = await client
      .from('shared_scripts')
      .select('*')
      .eq('team_id', teamId)
      .order('updated_at', { ascending: false });
    if (error) { console.warn('[Teams] getSharedScripts', error); return []; }
    // Normalize to the app's script shape (read-only, flagged as shared)
    return (data || []).map(r => ({
      id: 'shared:' + r.id,
      sharedId: r.id,
      teamId: r.team_id,
      title: r.title,
      body: r.body,
      tags: Array.isArray(r.tags) ? r.tags : [],
      type: r.type || 'standard',
      nodes: Array.isArray(r.nodes) ? r.nodes : [],
      startNodeId: r.start_node_id || null,
      shared: true,
      readonly: true,
      updatedAt: r.updated_at
    }));
  }

  return {
    init,
    ready,
    createTeam,
    joinTeam,
    leaveTeam,
    getMyTeams,
    getMembers,
    setMemberRole,
    removeMember,
    pushScript,
    updateSharedScript,
    deleteSharedScript,
    getSharedScripts
  };
})();
