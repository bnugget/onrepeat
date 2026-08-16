import React, { useCallback, useEffect, useState } from "react";
import Dashboard from "./Dashboard.jsx";
import AuthGate from "./components/AuthGate.jsx";
import TopBar from "./components/TopBar.jsx";
import ProfileUpload from "./components/ProfileUpload.jsx";
import GroupView from "./components/GroupView.jsx";
import HowToUse from "./components/HowToUse.jsx";
import { onAuthChange, getCurrentUser, signOut, getDisplayName } from "./lib/auth.js";
import { listProfiles, getProfileData, deleteProfile } from "./lib/profilesApi.js";

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = checking, null = signed out
  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [activeProfileData, setActiveProfileData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [mode, setMode] = useState("dashboard"); // "dashboard" | "group"
  const [showUpload, setShowUpload] = useState(false);
  const [refreshTarget, setRefreshTarget] = useState(null);
  const [profileError, setProfileError] = useState(null);

  useEffect(() => {
    getCurrentUser().then(setUser);
    return onAuthChange(setUser);
  }, []);

  const reloadProfiles = useCallback(async () => {
    const list = await listProfiles();
    setProfiles(list);
    return list;
  }, []);

  useEffect(() => {
    if (user) reloadProfiles();
  }, [user, reloadProfiles]);

  async function loadProfileData(profile) {
    setLoadingProfile(true);
    setProfileError(null);
    try {
      const data = await getProfileData(profile.storage_path);
      setActiveProfileId(profile.id);
      setActiveProfileData(data);
    } catch (err) {
      setProfileError(err.message || "Couldn't load that profile.");
    } finally {
      setLoadingProfile(false);
    }
  }

  function selectProfile(id) {
    const profile = profiles.find((p) => p.id === id);
    if (profile) loadProfileData(profile);
  }

  async function handleUploadDone() {
    const wasRefreshing = refreshTarget;
    setShowUpload(false);
    setRefreshTarget(null);
    const list = await reloadProfiles();

    if (wasRefreshing) {
      const updated = list.find((p) => p.id === wasRefreshing.id);
      if (updated) loadProfileData(updated);
    } else if (!activeProfileId && user) {
      const mine = list.filter((p) => p.owner_id === user.id);
      if (mine.length > 0) loadProfileData(mine[mine.length - 1]);
    }
  }

  async function handleDeleteProfile(profile) {
    if (!confirm(`Delete "${profile.name}"? This can't be undone.`)) return;
    await deleteProfile(profile);
    if (activeProfileId === profile.id) {
      setActiveProfileId(null);
      setActiveProfileData(null);
    }
    reloadProfiles();
  }

  if (user === undefined) {
    return (
      <div className="auth-gate">
        <p className="chart-hint">Loading…</p>
      </div>
    );
  }
  if (!user) {
    return <AuthGate onAuthed={setUser} />;
  }

  return (
    <>
      <TopBar
        profiles={profiles}
        activeProfileId={activeProfileId}
        onSelectProfile={selectProfile}
        currentUserId={user.id}
        displayName={getDisplayName(user)}
        mode={mode}
        onModeChange={setMode}
        onUploadNew={() => { setRefreshTarget(null); setShowUpload(true); }}
        onRefresh={(p) => { setRefreshTarget(p); setShowUpload(true); }}
        onDelete={handleDeleteProfile}
        onSignOut={signOut}
      />

      {showUpload && (
        <div className="wrap" style={{ paddingTop: 30 }}>
          <ProfileUpload
            userId={user.id}
            existingProfile={refreshTarget}
            onDone={handleUploadDone}
            onCancel={() => setShowUpload(false)}
          />
        </div>
      )}

      {!showUpload && mode === "dashboard" && (
        activeProfileData ? (
          <Dashboard key={activeProfileId} rawData={activeProfileData} />
        ) : (
          <div className="wrap" style={{ paddingTop: 30 }}>
            {profileError && <p className="insight-error" style={{ marginBottom: 12 }}>{profileError}</p>}
            {loadingProfile ? (
              <p className="chart-hint">Loading profile…</p>
            ) : profiles.length === 0 ? (
              <div className="chart-card" style={{ maxWidth: 480, margin: "40px auto", textAlign: "center" }}>
                <p className="ranked-primary" style={{ fontSize: 16, marginBottom: 8 }}>No profiles yet</p>
                <p className="mood-empty" style={{ marginBottom: 14 }}>Create your first one to get started.</p>
                <button className="btn primary" onClick={() => setShowUpload(true)}>+ New profile</button>
              </div>
            ) : (
              <p className="mood-empty">Pick a profile from the top bar to view its dashboard.</p>
            )}
          </div>
        )
      )}

      {/* GroupView stays mounted (just hidden) across mode switches so its
          state — picked profiles, date range, active sub-tab, etc. — isn't
          wiped every time the person tabs away and back. */}
      <div style={{ display: !showUpload && mode === "group" ? "block" : "none" }}>
        <GroupView profiles={profiles} getProfileData={getProfileData} />
      </div>

      {!showUpload && mode === "help" && <HowToUse />}
    </>
  );
}
