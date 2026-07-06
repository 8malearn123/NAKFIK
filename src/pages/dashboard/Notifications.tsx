import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { Bell, Send, History, Settings2 } from "lucide-react";
import SendNotification from "@/components/notifications/SendNotification";
import NotificationsLog from "@/components/notifications/NotificationsLog";
import WhatsAppSettings from "@/components/notifications/WhatsAppSettings";
import InAppNotifications from "@/components/notifications/InAppNotifications";

const Notifications = () => {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="font-bold text-2xl text-foreground">الإشعارات</h1>
          <p className="text-muted-foreground text-sm mt-1">
            إرسال وإدارة الإشعارات عبر واتساب والمنصة
          </p>
        </div>

        <Tabs defaultValue="send" dir="rtl">
          <TabsList className="mb-6 w-full justify-start">
            <TabsTrigger value="send" className="gap-1.5">
              <Send className="w-4 h-4" />
              إرسال إشعار
            </TabsTrigger>
            <TabsTrigger value="inbox" className="gap-1.5">
              <Bell className="w-4 h-4" />
              الوارد
            </TabsTrigger>
            <TabsTrigger value="log" className="gap-1.5">
              <History className="w-4 h-4" />
              السجل
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5">
              <Settings2 className="w-4 h-4" />
              إعدادات واتساب
            </TabsTrigger>
          </TabsList>

          <TabsContent value="send">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <SendNotification />
            </motion.div>
          </TabsContent>

          <TabsContent value="inbox">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <InAppNotifications />
            </motion.div>
          </TabsContent>

          <TabsContent value="log">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <NotificationsLog />
            </motion.div>
          </TabsContent>

          <TabsContent value="settings">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <WhatsAppSettings />
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Notifications;
