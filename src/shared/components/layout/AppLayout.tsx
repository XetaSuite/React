import { Outlet } from "react-router";
import { SidebarProvider } from "@/shared/hooks/SidebarProvider";
import { useSidebar } from "@/shared/hooks/useSidebar";
import { AppHeader } from "@/shared/components/header/AppHeader";
import { AppSidebar, Backdrop } from "@/shared/components/sidebar";

const LayoutContent: React.FC = () => {
    const { isExpanded, isHovered, isMobileOpen } = useSidebar();

    return (
        <div>
            <div>
                <AppSidebar />
                <Backdrop />
            </div>
            <div
                className={`flex-1 transition-all duration-300 ease-in-out ${isExpanded || isHovered ? "lg:ml-72.5" : "lg:ml-22.5"
                    } ${isMobileOpen ? "ml-0" : ""}`}
            >
                <AppHeader />
                <div className="p-4 mx-auto md:p-6">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export const AppLayout: React.FC = () => {
    return (
        <SidebarProvider>
            <LayoutContent />
        </SidebarProvider>
    );
};
