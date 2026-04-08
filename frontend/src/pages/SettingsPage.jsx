import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    orgName: "NIPA",
    defaultRiskType: "Operational Risk"
  });

  useEffect(() => {
    const saved = localStorage.getItem("risksense_settings");
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
  }, []);

  const handleChange = (k, v) => {
    setSettings((prev) => ({ ...prev, [k]: v }));
  };

  const handleSave = () => {
    localStorage.setItem("risksense_settings", JSON.stringify(settings));
    toast.success("Settings saved successfully.");
  };

  return (
    <div className="flex-1 p-6 animate-fade-in overflow-y-auto">
      <h1 className="font-display text-2xl font-bold text-foreground mb-1">Settings</h1>
      <p className="text-sm text-muted-foreground mb-6">Application configuration</p>
      
      <div className="space-y-4 max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle>Organization Settings</CardTitle>
            <CardDescription>Details shown on your generated Risk Reports.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Organization Name</label>
              <Input 
                value={settings.orgName} 
                onChange={(e) => handleChange("orgName", e.target.value)} 
                placeholder="e.g. Acme Corp" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Default Risk Type</label>
              <select 
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={settings.defaultRiskType}
                onChange={(e) => handleChange("defaultRiskType", e.target.value)}
              >
                <option value="Operational Risk">Operational Risk</option>
                <option value="Strategic Risk">Strategic Risk</option>
                <option value="Financial Risk">Financial Risk</option>
                <option value="Compliance Risk">Compliance Risk</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <Button onClick={handleSave} className="mt-2 text-xs">Save Changes</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="glass rounded-xl p-4">
              <p className="text-sm text-foreground font-semibold">RiskSense Management Platform</p>
              <p className="text-xs text-muted-foreground mt-0.5">Version 1.1.0 — FastAPI + Supabase + React</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
