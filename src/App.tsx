import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
import ImpersonationBanner from "@/components/admin/ImpersonationBanner";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import EventsMarketplace from "./pages/EventsMarketplace";
import Favorites from "./pages/Favorites";
import EventDetail from "./pages/EventDetail";
import MyTickets from "./pages/MyTickets";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import DashboardHome from "./pages/dashboard/DashboardHome";
import MyEvents from "./pages/dashboard/MyEvents";
import CreateEvent from "./pages/dashboard/CreateEvent";
import CheckIn from "./pages/dashboard/CheckIn";
import Settings from "./pages/dashboard/Settings";
import Notifications from "./pages/dashboard/Notifications";
import EventGuests from "./pages/dashboard/EventGuests";
import EventCheckpoints from "./pages/dashboard/EventCheckpoints";
import Team from "./pages/dashboard/Team";

import EditEvent from "./pages/dashboard/EditEvent";
import EventFeaturedCards from "./pages/dashboard/EventFeaturedCards";
import AdminTeam from "./pages/admin/AdminTeam";
import Reports from "./pages/dashboard/Reports";
import AdminHome from "./pages/admin/AdminHome";
import PendingEvents from "./pages/admin/PendingEvents";
import AllEvents from "./pages/admin/AllEvents";
import Organizers from "./pages/admin/Organizers";
import OrganizerEvents from "./pages/admin/OrganizerEvents";
import AllUsers from "./pages/admin/AllUsers";
import InviteUser from "./pages/admin/InviteUser";
import AdminCreateEvent from "./pages/admin/AdminCreateEvent";
import Subscriptions from "./pages/admin/Subscriptions";
import Analytics from "./pages/admin/Analytics";
import Announcements from "./pages/admin/Announcements";
import RSVPConfirm from "./pages/RSVPConfirm";
import EventHeatmap from "./pages/dashboard/EventHeatmap";
import AdminHeatmap from "./pages/admin/AdminHeatmap";
import AdminFinance from "./pages/admin/AdminFinance";
import OrganizerEarnings from "./pages/dashboard/Earnings";
import OrganizerSubscription from "./pages/dashboard/Subscription";
import NetworkingProfile from "./pages/NetworkingProfile";
import MyProfile from "./pages/MyProfile";
import ConnectCard from "./pages/ConnectCard";
import MyConnections from "./pages/MyConnections";
import OrganizerProfile from "./pages/OrganizerProfile";
import MyNotifications from "./pages/MyNotifications";
import RegisterProvider from "./pages/RegisterProvider";
import ServiceMarket from "./pages/dashboard/ServiceMarket";
import PartnerDiscounts from "./pages/dashboard/PartnerDiscounts";
import AdminProviderCategories from "./pages/admin/AdminProviderCategories";
import AdminServiceProviders from "./pages/admin/AdminServiceProviders";
import AdminServiceRequests from "./pages/admin/AdminServiceRequests";
import AdminPartnerBrands from "./pages/admin/AdminPartnerBrands";
import AdminFeaturedServices from "./pages/admin/AdminFeaturedServices";
import PrivateInvitations from "./pages/dashboard/PrivateInvitations";
import GuestLists from "./pages/dashboard/GuestLists";
import PrivateInvitation from "./pages/PrivateInvitation";
import AdminPrivateInvitations from "./pages/admin/AdminPrivateInvitations";
import CertificateDesigns from "./pages/dashboard/CertificateDesigns";
import CertificateView from "./pages/CertificateView";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <ImpersonationProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ImpersonationBanner />
              <Routes>
                {/* Public */}
                <Route path="/" element={<Index />} />
                <Route path="/events" element={<EventsMarketplace />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/events/:id" element={<EventDetail />} />
                <Route path="/o/:id" element={<OrganizerProfile />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/rsvp/:token" element={<RSVPConfirm />} />
                <Route path="/connect/:code" element={<ConnectCard />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/register-provider" element={<RegisterProvider />} />
                <Route path="/invite/:token" element={<PrivateInvitation />} />
                <Route path="/certificate/:token" element={<CertificateView />} />

                {/* Attendee */}
                <Route path="/my-tickets" element={
                  <ProtectedRoute><MyTickets /></ProtectedRoute>
                } />
                <Route path="/my/profile" element={
                  <ProtectedRoute><MyProfile /></ProtectedRoute>
                } />
                <Route path="/my/profile/networking" element={
                  <ProtectedRoute><NetworkingProfile /></ProtectedRoute>
                } />
                <Route path="/my/connections" element={
                  <ProtectedRoute><MyConnections /></ProtectedRoute>
                } />
                <Route path="/my/notifications" element={
                  <ProtectedRoute><MyNotifications /></ProtectedRoute>
                } />

                {/* Organizer Dashboard */}
                <Route path="/dashboard" element={<ProtectedRoute requiredAccountType="organizer"><DashboardHome /></ProtectedRoute>} />
                <Route path="/dashboard/events" element={<ProtectedRoute requiredAccountType="organizer"><MyEvents /></ProtectedRoute>} />
                <Route path="/dashboard/events/create" element={<ProtectedRoute requiredAccountType="organizer"><CreateEvent /></ProtectedRoute>} />
                <Route path="/dashboard/events/:eventId/edit" element={<ProtectedRoute requiredAccountType="organizer"><EditEvent /></ProtectedRoute>} />
                <Route path="/dashboard/check-in" element={<ProtectedRoute requiredAccountType="organizer"><CheckIn /></ProtectedRoute>} />
                
                <Route path="/dashboard/settings" element={<ProtectedRoute requiredAccountType="organizer"><Settings /></ProtectedRoute>} />
                <Route path="/dashboard/notifications" element={<ProtectedRoute requiredAccountType="organizer"><Notifications /></ProtectedRoute>} />
                <Route path="/dashboard/team" element={<ProtectedRoute requiredAccountType="organizer"><Team /></ProtectedRoute>} />
                <Route path="/dashboard/reports" element={<ProtectedRoute requiredAccountType="organizer"><Reports /></ProtectedRoute>} />
                <Route path="/dashboard/events/:eventId/guests" element={<ProtectedRoute requiredAccountType="organizer"><EventGuests /></ProtectedRoute>} />
                <Route path="/dashboard/events/:eventId/checkpoints" element={<ProtectedRoute requiredAccountType="organizer"><EventCheckpoints /></ProtectedRoute>} />
                <Route path="/dashboard/events/:eventId/heatmap" element={<ProtectedRoute requiredAccountType="organizer"><EventHeatmap /></ProtectedRoute>} />
                <Route path="/dashboard/events/:eventId/featured-cards" element={<ProtectedRoute requiredAccountType="organizer"><EventFeaturedCards /></ProtectedRoute>} />
                <Route path="/dashboard/earnings" element={<ProtectedRoute requiredAccountType="organizer"><OrganizerEarnings /></ProtectedRoute>} />
                <Route path="/dashboard/subscription" element={<ProtectedRoute requiredAccountType="organizer"><OrganizerSubscription /></ProtectedRoute>} />
                <Route path="/dashboard/services" element={<ProtectedRoute requiredAccountType="organizer"><ServiceMarket /></ProtectedRoute>} />
                <Route path="/dashboard/discounts" element={<ProtectedRoute requiredAccountType="organizer"><PartnerDiscounts /></ProtectedRoute>} />
                <Route path="/dashboard/invitations" element={<ProtectedRoute requiredAccountType="organizer"><PrivateInvitations /></ProtectedRoute>} />
                <Route path="/dashboard/guest-lists" element={<ProtectedRoute requiredAccountType="organizer"><GuestLists /></ProtectedRoute>} />
                <Route path="/dashboard/certificates" element={<ProtectedRoute requiredAccountType="organizer"><CertificateDesigns /></ProtectedRoute>} />

                {/* Super Admin */}
                <Route path="/admin" element={<ProtectedRoute requireSuperAdmin><AdminHome /></ProtectedRoute>} />
                <Route path="/admin/pending" element={<ProtectedRoute requireSuperAdmin><PendingEvents /></ProtectedRoute>} />
                <Route path="/admin/events" element={<ProtectedRoute requireSuperAdmin><AllEvents /></ProtectedRoute>} />
                <Route path="/admin/organizers" element={<ProtectedRoute requireSuperAdmin><Organizers /></ProtectedRoute>} />
                <Route path="/admin/organizers/:id/events" element={<ProtectedRoute requireSuperAdmin><OrganizerEvents /></ProtectedRoute>} />
                <Route path="/admin/users" element={<ProtectedRoute requireSuperAdmin><AllUsers /></ProtectedRoute>} />
                <Route path="/admin/users/invite" element={<ProtectedRoute requireSuperAdmin><InviteUser /></ProtectedRoute>} />
                <Route path="/admin/team" element={<ProtectedRoute requireSuperAdmin><AdminTeam /></ProtectedRoute>} />
                <Route path="/admin/events/create" element={<ProtectedRoute requireSuperAdmin><AdminCreateEvent /></ProtectedRoute>} />
                <Route path="/admin/subscriptions" element={<ProtectedRoute requireSuperAdmin><Subscriptions /></ProtectedRoute>} />
                <Route path="/admin/analytics" element={<ProtectedRoute requireSuperAdmin><Analytics /></ProtectedRoute>} />
                <Route path="/admin/announcements" element={<ProtectedRoute requireSuperAdmin><Announcements /></ProtectedRoute>} />
                <Route path="/admin/finance" element={<ProtectedRoute requireSuperAdmin><AdminFinance /></ProtectedRoute>} />
                <Route path="/admin/heatmap" element={<ProtectedRoute requireSuperAdmin><AdminHeatmap /></ProtectedRoute>} />
                <Route path="/admin/provider-categories" element={<ProtectedRoute requireSuperAdmin><AdminProviderCategories /></ProtectedRoute>} />
                <Route path="/admin/service-providers" element={<ProtectedRoute requireSuperAdmin><AdminServiceProviders /></ProtectedRoute>} />
                <Route path="/admin/service-requests" element={<ProtectedRoute requireSuperAdmin><AdminServiceRequests /></ProtectedRoute>} />
                <Route path="/admin/partner-brands" element={<ProtectedRoute requireSuperAdmin><AdminPartnerBrands /></ProtectedRoute>} />
                <Route path="/admin/featured-services" element={<ProtectedRoute requireSuperAdmin><AdminFeaturedServices /></ProtectedRoute>} />
                <Route path="/admin/private-invitations" element={<ProtectedRoute requireSuperAdmin><AdminPrivateInvitations /></ProtectedRoute>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </ImpersonationProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
