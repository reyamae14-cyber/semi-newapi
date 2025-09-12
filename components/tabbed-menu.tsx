import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Server } from "@/types";
import { useEffect, useState } from "react";
import { ClientTime } from "@/components/client-time";
import { themeManager } from "@/lib/theme-manager";

interface TabbedMenuProps {
  selectedServer: Server | null;
  servers: Server[];
  onServerSelect: (server: Server) => void;
  onRefresh: () => void;
  serverPings: Record<string, number>;
  children?: React.ReactNode;
}

export function TabbedMenu({
  selectedServer,
  servers,
  onServerSelect,
  onRefresh,
  serverPings,
  children,
}: TabbedMenuProps) {
  const [activeTab, setActiveTab] = useState("servers");
  const [currentTheme, setCurrentTheme] = useState(themeManager.getCurrentTheme());

  useEffect(() => {
    const unsubscribe = themeManager.subscribe((theme) => {
      setCurrentTheme(theme);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (selectedServer) {
      setActiveTab("servers");
    }
  }, [selectedServer]);

  return (
    <Tabs defaultValue="servers" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="servers">Servers</TabsTrigger>
        <TabsTrigger value="themes">Themes</TabsTrigger>
      </TabsList>
      <TabsContent value="servers">
        <div className="flex flex-col space-y-2 p-4">
          <ClientTime showCountry={true} />
          {servers.map((server) => (
            <div
              key={server.name}
              className={cn(
                "flex justify-between items-center p-2 rounded-md cursor-pointer",
                selectedServer?.name === server.name
                  ? `bg-[${currentTheme.colors.primary}] bg-opacity-20`
                  : "hover:bg-gray-700"
              )}
              onClick={() => onServerSelect(server)}
            >
              <span>{server.name}</span>
              <span>{serverPings[server.name] || "N/A"}ms</span>
            </div>
          ))}
          <button onClick={onRefresh} className="mt-4 p-2 bg-blue-500 rounded-md">
            Refresh Status
          </button>
        </div>
      </TabsContent>
      <TabsContent value="themes">{children}</TabsContent>
    </Tabs>
  );
}