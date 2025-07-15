
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
  const [eventResults, setEventResults] = useState<string>('');
  const [contractAddr, setContractAddr] = useState<string>(''); // Replace with your contract address

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
 
  const abi = [
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_to",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_amount",
				"type": "uint256"
			}
		],
		"name": "sendTokens",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "_from",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "_to",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "_amount",
				"type": "uint256"
			}
		],
		"name": "TokensSent",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "tokenBalance",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
];

  // Custom serializer to handle BigInt values
  const serializeEvent = (obj: any): string => {
    return JSON.stringify(obj, (_key, value) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      return value;
    }, 2);
  };

  async function listenToEvents() {
    try {
      let contractInstance = new web3.eth.Contract(abi, contractAddr);
      contractInstance.events.TokensSent().on("data",
        (event: any) => {
        setEventResults(prevResults => serializeEvent(event) + "<br />========<br />" + prevResults);
      })
    
      setStatusMessage("Listening to events on contract: " + contractAddr);
        
    } catch (error) {
      console.error("Error listening to events:", error);
      setStatusMessage("Error: Failed to listen to events.");
      setEventResults("")
    }
  };

  async function getAllPastEvents() {
    if (!web3 || !contractAddr) {
      setStatusMessage("Error: Web3 not initialized or contract address missing.");
      return;
    }

    try {
      setStatusMessage("Fetching past events...");
      setEventResults("Loading past events...");

      const contractInstance = new web3.eth.Contract(abi, contractAddr);
      
      // Get past events from the last 1000 blocks (you can adjust this)
      const currentBlock = await web3.eth.getBlockNumber();
      const fromBlock = Math.max(0, Number(currentBlock) - 1000);
      
      const pastEvents = await contractInstance.getPastEvents('TokensSent', {
        fromBlock: fromBlock,
        toBlock: 'latest'
      });

      if (pastEvents.length === 0) {
        setEventResults("No past events found in the last 1000 blocks.");
        setStatusMessage("Past events search completed - no events found.");
        return;
      }

      // Format and display past events
      let formattedEvents = `<strong>Found ${pastEvents.length} past events:</strong><br /><br />`;
      
      pastEvents.forEach((event: any, index: number) => {
        formattedEvents += `<strong>Event ${index + 1}:</strong><br />`;
        formattedEvents += serializeEvent(event);
        formattedEvents += "<br />========<br />";
      });

      setEventResults(formattedEvents);
      setStatusMessage(`Successfully retrieved ${pastEvents.length} past events.`);
      
    } catch (error: any) {
      console.error("Error fetching past events:", error);
      setStatusMessage("Error: Failed to fetch past events - " + (error.message || "Unknown error"));
      setEventResults("");
    }
  }

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

      <div className='flex  items-center justify-center gap-x-5'>
        <input 
          type="text" 
          value={contractAddr} 
          onChange={(e) => setContractAddr(e.target.value)} 
          placeholder="Enter Contract Address" 
          className='border border-gray-300 rounded-lg p-3 w-full max-w-md text-center'
        />
        <button 
          className='bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-400 cursor-pointer font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed' 
          onClick={listenToEvents}
          disabled={!isConnected || !contractAddr}
        >
          Listen to Events
        </button>
        <button 
          className='bg-purple-500 text-white px-6 py-3 rounded-lg hover:bg-purple-400 cursor-pointer font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed' 
          onClick={getAllPastEvents}
          disabled={!isConnected || !contractAddr}
        >
          Get Past Events
        </button>
      </div>

      {eventResults && (
        <div className='my-8 mx-4 '>
          <h3 className='text-xl font-semibold text-center mb-4'>Event Results:</h3>
          <div 
            className='bg-gray-100 border rounded-lg p-4 max-h-96 overflow-y-auto text-sm'
            dangerouslySetInnerHTML={{ __html: eventResults }}
          />
        </div>
      )}

    </>
  )
}

export default App
