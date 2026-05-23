import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Eye, EyeOff, Loader2, Check, X } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function Settings() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [credentials, setCredentials] = useState({
    higgsfield_api_key: "",
    instagram_token: "",
    instagram_account_id: "",
    youtube_token: "",
    tiktok_token: "",
    tiktok_open_id: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [validationStatus, setValidationStatus] = useState<Record<string, boolean>>({});
  const saveCredentialMutation = trpc.pipeline.saveApiCredential.useMutation();

  const credentialMap: Record<string, { service: string; credentialType: string }> = {
    higgsfield_api_key: { service: "higgsfield", credentialType: "api_key" },
    instagram_token: { service: "instagram", credentialType: "oauth_token" },
    instagram_account_id: { service: "instagram", credentialType: "business_account_id" },
    youtube_token: { service: "youtube", credentialType: "oauth_token" },
    tiktok_token: { service: "tiktok", credentialType: "oauth_token" },
    tiktok_open_id: { service: "tiktok", credentialType: "open_id" },
  };

  const handleCredentialChange = (key: string, value: string) => {
    setCredentials((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveCredentials = async () => {
    setIsSaving(true);
    try {
      const entries = Object.entries(credentials).filter(([, value]) => value.trim().length > 0);
      if (entries.length === 0) {
        toast.error("Add at least one credential before saving");
        return;
      }

      for (const [key, value] of entries) {
        const mapping = credentialMap[key];
        if (!mapping) continue;
        await saveCredentialMutation.mutateAsync({
          service: mapping.service,
          credentialType: mapping.credentialType,
          value,
        });
      }

      toast.success("Credentials saved securely");
      setCredentials({
        higgsfield_api_key: "",
        instagram_token: "",
        instagram_account_id: "",
        youtube_token: "",
        tiktok_token: "",
        tiktok_open_id: "",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save credentials");
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidateCredentials = async (service: string) => {
    const hasLocalValue = Object.entries(credentialMap).some(([key, mapping]) => mapping.service === service && credentials[credentialKey]?.trim());
    if (!hasLocalValue) {
      toast.error(`Add ${service} credentials before validating`);
      return;
    }
    setValidationStatus((prev) => ({ ...prev, [service]: true }));
    toast.success(`${service} credentials are ready to save`);
  };

  const toggleSecretVisibility = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const CredentialInput = ({
    label,
    credentialKey,
    placeholder,
    service,
  }: {
    label: string;
    credentialKey: keyof typeof credentials;
    placeholder: string;
    service: string;
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={credentialKey}>{label}</Label>
        {validationStatus[service] && <Check className="w-4 h-4 text-green-400" />}
      </div>
      <div className="flex gap-2">
        <Input
          id={credentialKey}
          type={showSecrets[credentialKey] ? "text" : "password"}
          placeholder={placeholder}
          value={credentials[credentialKey]}
          onChange={(e) => handleCredentialChange(credentialKey, e.target.value)}
          className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => toggleSecretVisibility(credentialKey)}
          className="text-slate-400 hover:text-white"
        >
          {showSecrets[credentialKey] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => handleValidateCredentials(service)}
          className="text-slate-400 hover:text-white"
        >
          Validate
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/projects")}
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">Settings</h1>
              <p className="text-sm text-slate-400">Manage your API keys and credentials</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="higgsfield" className="w-full max-w-2xl">
          <TabsList className="bg-slate-800 border-slate-700 grid w-full grid-cols-4">
            <TabsTrigger value="higgsfield">Higgsfield</TabsTrigger>
            <TabsTrigger value="instagram">Instagram</TabsTrigger>
            <TabsTrigger value="youtube">YouTube</TabsTrigger>
            <TabsTrigger value="tiktok">TikTok</TabsTrigger>
          </TabsList>

          {/* Higgsfield Tab */}
          <TabsContent value="higgsfield" className="space-y-6 mt-6">
            <Card className="bg-slate-800/50 border-slate-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Higgsfield API Key</h3>
              <p className="text-sm text-slate-400 mb-6">
                Get your API key from{" "}
                <a
                  href="https://higgsfield.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300"
                >
                  higgsfield.ai
                </a>
              </p>

              <div className="space-y-4">
                <CredentialInput
                  label="API Key"
                  credentialKey="higgsfield_api_key"
                  placeholder="Enter your Higgsfield API key"
                  service="higgsfield"
                />

                <Button
                  onClick={handleSaveCredentials}
                  disabled={isSaving}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Credentials"
                  )}
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Instagram Tab */}
          <TabsContent value="instagram" className="space-y-6 mt-6">
            <Card className="bg-slate-800/50 border-slate-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Instagram Business Account</h3>
              <p className="text-sm text-slate-400 mb-6">
                Connect your Instagram Business Account to publish videos directly.
              </p>

              <div className="space-y-4">
                <CredentialInput
                  label="Access Token"
                  credentialKey="instagram_token"
                  placeholder="Enter your Instagram access token"
                  service="instagram"
                />
                <CredentialInput
                  label="Business Account ID"
                  credentialKey="instagram_account_id"
                  placeholder="Enter your Business Account ID"
                  service="instagram"
                />

                <Button
                  onClick={handleSaveCredentials}
                  disabled={isSaving}
                  className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-0"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Instagram Credentials"
                  )}
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* YouTube Tab */}
          <TabsContent value="youtube" className="space-y-6 mt-6">
            <Card className="bg-slate-800/50 border-slate-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">YouTube Account</h3>
              <p className="text-sm text-slate-400 mb-6">
                Connect your YouTube account to publish videos directly.
              </p>

              <div className="space-y-4">
                <CredentialInput
                  label="Access Token"
                  credentialKey="youtube_token"
                  placeholder="Enter your YouTube access token"
                  service="youtube"
                />

                <Button
                  onClick={handleSaveCredentials}
                  disabled={isSaving}
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save YouTube Credentials"
                  )}
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* TikTok Tab */}
          <TabsContent value="tiktok" className="space-y-6 mt-6">
            <Card className="bg-slate-800/50 border-slate-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">TikTok Account</h3>
              <p className="text-sm text-slate-400 mb-6">
                Connect your TikTok account to publish videos directly.
              </p>

              <div className="space-y-4">
                <CredentialInput
                  label="Access Token"
                  credentialKey="tiktok_token"
                  placeholder="Enter your TikTok access token"
                  service="tiktok"
                />
                <CredentialInput
                  label="Open ID"
                  credentialKey="tiktok_open_id"
                  placeholder="Enter your TikTok Open ID"
                  service="tiktok"
                />

                <Button
                  onClick={handleSaveCredentials}
                  disabled={isSaving}
                  className="w-full bg-gradient-to-r from-black to-slate-800 hover:from-slate-900 hover:to-slate-700 text-white border-0"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save TikTok Credentials"
                  )}
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Info Card */}
        <Card className="bg-blue-500/10 border-blue-500/20 p-6 mt-8 max-w-2xl">
          <h4 className="font-semibold text-blue-300 mb-2">Security Notice</h4>
          <p className="text-sm text-blue-200">
            All credentials are encrypted and stored securely. We never store your passwords or share your credentials with
            third parties. Your API keys are only used to publish content on your behalf.
          </p>
        </Card>
      </div>
    </div>
  );
}
