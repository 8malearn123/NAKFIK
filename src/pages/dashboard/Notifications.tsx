import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PageHeader from "@/components/app/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SendNotification from "@/components/notifications/SendNotification";
import NotificationsLog from "@/components/notifications/NotificationsLog";
import WhatsAppSettings from "@/components/notifications/WhatsAppSettings";
import InAppNotifications from "@/components/notifications/InAppNotifications";

const Notifications = () => {
  const [tab, setTab] = useState("send");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader title="الإشعارات" description="إرسال وإدارة الإشعارات عبر واتساب والمنصة" />

        <Tabs value={tab} onValueChange={setTab} dir="rtl">
          {/* الشريط يمرر داخل مكانه على الجوال حتى لا تتمدد الصفحة أفقياً */}
          <TabsList className="max-w-full justify-start overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TabsTrigger value="send" className="px-3 sm:px-4">إرسال إشعار</TabsTrigger>
            <TabsTrigger value="inbox" className="px-3 sm:px-4">الوارد</TabsTrigger>
            <TabsTrigger value="log" className="px-3 sm:px-4">السجل</TabsTrigger>
            <TabsTrigger value="settings" className="px-3 sm:px-4">إعدادات واتساب</TabsTrigger>
          </TabsList>

          <TabsContent value="send" className="mt-6">
            <SendNotification />
          </TabsContent>

          <TabsContent value="inbox" className="mt-6">
            <InAppNotifications />
          </TabsContent>

          <TabsContent value="log" className="mt-6">
            <NotificationsLog onCompose={() => setTab("send")} />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <WhatsAppSettings />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Notifications;
