import { useState, useEffect } from "react";
import { User, Mail, Github, Shield, Camera, Link as LinkIcon, Unlink } from "lucide-react";
import { auth } from "../firebase";
import { onAuthStateChanged, GithubAuthProvider, linkWithPopup, unlink } from "firebase/auth";

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [isGithubLinked, setIsGithubLinked] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Check if GitHub provider is linked
        const isLinked = currentUser.providerData.some(
          (provider) => provider.providerId === 'github.com'
        );
        setIsGithubLinked(isLinked);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLinkGithub = async () => {
    if (!user) return;
    setIsLinking(true);
    try {
      const provider = new GithubAuthProvider();
      await linkWithPopup(user, provider);
      setIsGithubLinked(true);
    } catch (error: any) {
      console.error("Error linking GitHub:", error);
      if (error.code === 'auth/operation-not-allowed') {
        alert("GitHub sign-in is not enabled in your Firebase Console. Please enable it in Authentication > Sign-in method.");
      } else {
        alert("Failed to link GitHub account: " + error.message);
      }
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkGithub = async () => {
    if (!user) return;
    setIsLinking(true);
    try {
      await unlink(user, 'github.com');
      setIsGithubLinked(false);
    } catch (error) {
      console.error("Error unlinking GitHub:", error);
      alert("Failed to unlink GitHub account.");
    } finally {
      setIsLinking(false);
    }
  };

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Profile Settings</h1>
          <p className="text-zinc-400 mt-1">Manage your account and preferences</p>
        </div>
        <button className="bg-white hover:bg-zinc-200 text-black px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col items-center text-center">
            <div className="relative group">
              <div className="w-24 h-24 bg-zinc-800 rounded-full flex items-center justify-center overflow-hidden border-2 border-zinc-700">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User className="w-10 h-10 text-zinc-400" />
                )}
              </div>
              <button className="absolute bottom-0 right-0 w-8 h-8 bg-zinc-800 border border-zinc-700 rounded-full flex items-center justify-center text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors shadow-sm">
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <h2 className="text-lg font-semibold text-zinc-100 mt-4">{user.displayName || "Anonymous User"}</h2>
            <p className="text-sm text-zinc-400 mt-1">{user.email}</p>
            <div className="mt-4 inline-flex items-center space-x-1.5 bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full text-xs font-medium border border-emerald-500/20">
              <Shield className="w-3.5 h-3.5" />
              <span>Verified Account</span>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider mb-4">Connected Accounts</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-zinc-950 rounded-lg flex items-center justify-center border border-zinc-800">
                    <Github className="w-5 h-5 text-zinc-300" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-100">GitHub</p>
                    <p className="text-xs text-zinc-500">{isGithubLinked ? "Connected" : "Not connected"}</p>
                  </div>
                </div>
                {isGithubLinked ? (
                  <button 
                    onClick={handleUnlinkGithub}
                    disabled={isLinking}
                    className="text-zinc-400 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-500/10"
                    title="Unlink GitHub"
                  >
                    <Unlink className="w-4 h-4" />
                  </button>
                ) : (
                  <button 
                    onClick={handleLinkGithub}
                    disabled={isLinking}
                    className="text-zinc-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-zinc-800"
                    title="Link GitHub"
                  >
                    <LinkIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">Personal Information</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">First Name</label>
                  <input 
                    type="text" 
                    defaultValue={user.displayName?.split(' ')[0] || ""}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Last Name</label>
                  <input 
                    type="text" 
                    defaultValue={user.displayName?.split(' ').slice(1).join(' ') || ""}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type="email" 
                    defaultValue={user.email}
                    disabled
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-500 cursor-not-allowed"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Bio</label>
                <textarea 
                  rows={4}
                  placeholder="Tell us about yourself..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600 transition-colors resize-none"
                ></textarea>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">Preferences</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-zinc-200">Email Notifications</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Receive alerts about team activity</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-zinc-200">Two-Factor Authentication</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Add an extra layer of security</p>
                </div>
                <button className="text-sm font-medium text-zinc-400 hover:text-white transition-colors bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg border border-zinc-700">
                  Enable
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
