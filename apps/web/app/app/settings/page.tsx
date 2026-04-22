import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@ru/ui";
import { NotificationPreferences } from "./notification-preferences";

export default async function UserSettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-light mb-2">Settings</h1>
      <p className="text-muted-foreground mb-6 md:mb-8">
        Manage your account and notification preferences.
      </p>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Profile Info */}
        <Card glass>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{user.name || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
              {user.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{user.phone}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Timezone</p>
                <p className="font-medium">{user.timezone || "Asia/Kolkata"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Member since</p>
                <p className="font-medium">
                  {user.createdAt.toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card glass>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <NotificationPreferences
              marketingOptIn={user.marketingOptIn}
              whatsappOptIn={user.whatsappOptIn}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
