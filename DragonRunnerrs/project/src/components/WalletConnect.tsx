import React from 'react';
import { Wallet, LogOut, User } from 'lucide-react';

interface WalletInfo {
  address: string;
  balance: string;
  connected: boolean;
}

interface WalletConnectProps {
  wallet: WalletInfo;
  onConnect: () => void;
  onDisconnect: () => void;
}

const WalletConnect: React.FC<WalletConnectProps> = ({ wallet, onConnect, onDisconnect }) => {
  if (!wallet.connected) {
    return (
      <button
        onClick={onConnect}
        className="flex items-center space-x-2 px-6 py-2 border border-gray-600 rounded-lg hover:bg-white hover:text-black transition-all duration-200"
      >
        <Wallet className="h-4 w-4" />
        <span>Connect Wallet</span>
      </button>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      <div className="hidden md:flex flex-col text-right text-sm">
        <span className="text-gray-300">{parseFloat(wallet.balance).toFixed(4)} Avax</span>
        <span className="text-gray-500">
          {`${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`}
        </span>
      </div>
      
      <div className="flex items-center space-x-2">
        <div className="md:hidden flex items-center space-x-2 px-3 py-2 bg-gray-800 rounded-lg">
          <User className="h-4 w-4" />
          <span className="text-sm">
            {`${wallet.address.slice(0, 4)}...${wallet.address.slice(-4)}`}
          </span>
        </div>
        
        <button
          onClick={onDisconnect}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          title="Disconnect Wallet"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default WalletConnect;