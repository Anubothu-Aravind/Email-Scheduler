import { GoogleLogin } from "@react-oauth/google";
import type { CredentialResponse } from "@react-oauth/google";
import { useAuth } from "./AuthContext";

interface GoogleAuthProps {
  onError?: (error: string) => void;
}

export const GoogleAuth = ({ onError }: GoogleAuthProps) => {
  const { loginWithGoogle } = useAuth();

  const handleLoginSuccess = async (credentialResponse: CredentialResponse) => {
    console.log("✅ Google sign-in successful, credential received");
    if (credentialResponse.credential) {
      try {
        await loginWithGoogle(credentialResponse.credential);
      } catch (error) {
        console.error("❌ Backend login failed:", error);
        onError?.("Google login failed. Please try again.");
      }
    }
  };

  const handleLoginError = () => {
    console.error("❌ Google Login Failed");
    console.error("📍 Current origin:", window.location.origin);
    console.error("🔧 Fix: In Google Cloud Console, add this EXACT origin to 'Authorized JavaScript origins':");
    console.error(`   ${window.location.origin}`);
    console.error("💡 Then hard-refresh (Ctrl+Shift+R) or use incognito mode");
    onError?.("Google sign-in blocked by origin policy. Check browser console for fix.");
  };

  return (
    <div className="w-full flex justify-center">
      <div className="bg-[#e9f5ed] rounded-full px-6 py-3 inline-flex items-center justify-center">
        <GoogleLogin 
          onSuccess={handleLoginSuccess} 
          onError={handleLoginError}
          theme="outline"
          size="large"
          width={300}
          text="signin_with"
          shape="rectangular"
          use_fedcm_for_prompt={false}
        />
      </div>
    </div>
  );
};