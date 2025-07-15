
import { useState } from 'react';
import './App.css'

// Extend Window interface to include ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

function App() {
  const [account, setAccount] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('You are not connected with MetaMask. Please connect to continue.');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [web3, setWeb3] = useState<any>(null);

  const connectToMetaMask = async () => {
    if (window.ethereum) {
      try {
        // Ask MetaMask for account access
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        });
        
        // Dynamically import Web3 to avoid SSR issues
        const Web3 = (await import('web3')).default;
        const web3Instance = new Web3(window.ethereum);
        
        setWeb3(web3Instance);
        setAccount(accounts[0]);
        setStatusMessage(`Connected to Account: ${accounts[0]}`);
        setIsConnected(true);
        
        console.log("Connected to MetaMask:", accounts[0]);
      } catch (error: any) {
        if (error.code === 4001) {
          setStatusMessage("Error: Permission denied.");
          console.log("User denied account access");
        } else {
          setStatusMessage("Error: Failed to connect to MetaMask.");
          console.error("MetaMask error:", error);
        }
      }
    } else {
      setStatusMessage("Error: Please install MetaMask!");
      console.log("MetaMask not detected");
    }
  };

  return (
    <>
      <div className='text-2xl py-5 text-center' >
        Welcome to the Web3 Wallet App!
      </div>

      <div>
        <p className='text-center text-lg'>
          This is a simple wallet application built with React and TypeScript with Solidity Smart Contracts.
        </p>
        <p className='text-center text-lg'>
          Explore the features and functionalities to manage your digital assets.
        </p>
      </div>

      <button 
        className='bg-blue-500 text-white px-4 mt-5 mx-auto flex items-center justify-center rounded-2xl py-2 hover:bg-blue-400 cursor-pointer' 
        onClick={connectToMetaMask}
        disabled={isConnected}
      >
        <span className='font-semibold text-xl'>
          {isConnected ? 'Connected to MetaMask' : 'Connect With MetaMask'}
        </span> 
        <img src="/Images/metamask.png" alt="MetaMask Logo" className='object-contain w-[100px]' />
      </button>

      <div className='text-center mt-10 text-lg'>
        {statusMessage}
      </div>

    </>
  )
}

export default App
