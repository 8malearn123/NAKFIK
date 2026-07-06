import { createContext, useContext, useState, ReactNode } from "react";

interface ImpersonatedUser {
  id: string;
  full_name: string | null;
  email: string | null;
  account_type: string;
}

interface ImpersonationContextType {
  isImpersonating: boolean;
  impersonatedUser: ImpersonatedUser | null;
  startImpersonation: (user: ImpersonatedUser) => void;
  stopImpersonation: () => void;
}

const ImpersonationContext = createContext<ImpersonationContextType>({
  isImpersonating: false,
  impersonatedUser: null,
  startImpersonation: () => {},
  stopImpersonation: () => {},
});

export const useImpersonation = () => useContext(ImpersonationContext);

export const ImpersonationProvider = ({ children }: { children: ReactNode }) => {
  const [impersonatedUser, setImpersonatedUser] = useState<ImpersonatedUser | null>(() => {
    const saved = sessionStorage.getItem("impersonated_user");
    return saved ? JSON.parse(saved) : null;
  });

  const startImpersonation = (user: ImpersonatedUser) => {
    setImpersonatedUser(user);
    sessionStorage.setItem("impersonated_user", JSON.stringify(user));
  };

  const stopImpersonation = () => {
    setImpersonatedUser(null);
    sessionStorage.removeItem("impersonated_user");
  };

  return (
    <ImpersonationContext.Provider value={{
      isImpersonating: !!impersonatedUser,
      impersonatedUser,
      startImpersonation,
      stopImpersonation,
    }}>
      {children}
    </ImpersonationContext.Provider>
  );
};
