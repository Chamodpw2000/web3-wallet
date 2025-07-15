
import { useEffect, useState } from 'react';
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
  const [contractAddr, setContractAddr] = useState<string>('');
  const [tokenBalance, setTokenBalance] = useState<string>('0');
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [tokenAmount, setTokenAmount] = useState<string>('');

  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = async (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected their wallet
          console.log("User disconnected wallet");
          setAccount('');
          setIsConnected(false);
          setWeb3(null);
          setTokenBalance('0');
          setStatusMessage('You are not connected with MetaMask. Please connect to continue.');
        } else {
          // User switched to a different account
          console.log("User switched to account:", accounts[0]);
          setAccount(accounts[0]);
          setStatusMessage(`Connected to Account: ${accounts[0]}`);
          setIsConnected(true);
          
          // Reinitialize Web3 with the new account
          try {
            const Web3 = (await import('web3')).default;
            const web3Instance = new Web3(window.ethereum);
            setWeb3(web3Instance);
            
            // Reset token balance for new account
            setTokenBalance('0');
          } catch (error) {
            console.error("Error reinitializing Web3:", error);
          }
        }
      };

      const handleChainChanged = (chainId: string) => {
        console.log("User switched to network:", chainId);
        // Optionally reload the page when network changes
        window.location.reload();
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      // Cleanup
      return () => {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, []);

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
				"name": "Tokens sent from",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "Tokens received by",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "Number of tokens sent",
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

  // Custom serializer to handle BigInt values and format events nicely
  const serializeEvent = (event: any): string => {
    if (!event) return "No event data";

    let formatted = "<div class='bg-gray-50 p-3 rounded-lg my-2'>";
    
    // Event basic info
    formatted += `<div class='font-bold text-lg mb-2'>Event: ${event.event || 'Unknown'}</div>`;
    formatted += `<div class='mb-1'><span class='font-semibold text-gray-700'>Block Number:</span> <span class='text-gray-600'>${event.blockNumber || 'N/A'}</span></div>`;
    formatted += `<div class='mb-1'><span class='font-semibold text-gray-700'>Transaction Hash:</span> <span class='text-gray-600 text-xs break-all'>${event.transactionHash || 'N/A'}</span></div>`;
    formatted += `<div class='mb-3'><span class='font-semibold text-gray-700'>Contract Address:</span> <span class='text-gray-600 text-xs break-all'>${event.address || 'N/A'}</span></div>`;
    
    // Return Values (the main event data)
    if (event.returnValues) {
      formatted += "<div class='font-semibold mb-2'>Event Data:</div>";
      formatted += "<div class='ml-5 bg-blue-50 p-2 rounded'>";
      
      for (const key in event.returnValues) {
        // Skip numeric indices and __length__ property
        if (!isNaN(Number(key)) || key === '__length__') continue;
        
        let value = event.returnValues[key];
        if (typeof value === 'bigint') {
          value = value.toString();
        }
        formatted += `<div class='mb-1'><span class='font-medium'>${key}:</span> <span class='text-sm break-all'>${value}</span></div>`;
      }
      formatted += "</div>";
    }
    
    // Transaction details
    formatted += "<div class='font-semibold mt-3 mb-2'>Transaction Details:</div>";
    formatted += "<div class='ml-5 bg-orange-50 p-2 rounded'>";
    formatted += `<div class='mb-1'><span class='font-medium'>Log Index:</span> <span>${event.logIndex || 'N/A'}</span></div>`;
    formatted += `<div class='mb-1'><span class='font-medium'>Transaction Index:</span> <span>${event.transactionIndex || 'N/A'}</span></div>`;
    formatted += `<div class='mb-1'><span class='font-medium'>Block Hash:</span> <span class='text-xs break-all'>${event.blockHash || 'N/A'}</span></div>`;
    formatted += "</div>";
    
    formatted += "</div>";
    return formatted;
  };

  async function listenToEvents() {
    try {
      let contractInstance = new web3.eth.Contract(abi, contractAddr);
      contractInstance.events.TokensSent().on("data",
        (event: any) => {
        setEventResults(prevResults => serializeEvent(event) + "<hr class='my-5 border-t-2 border-gray-300'/>" + prevResults);
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
      let formattedEvents = `<div class='text-center bg-green-100 p-4 rounded-lg mb-5'>
        <div class='text-lg font-bold text-green-800'>Found ${pastEvents.length} Past Events</div>
      </div>`;
      
      pastEvents.forEach((event: any, index: number) => {
        formattedEvents += `<div class='my-5'>
          <div class='font-semibold text-base mb-2'>Event ${index + 1} of ${pastEvents.length}</div>
          ${serializeEvent(event)}
        </div>`;
        if (index < pastEvents.length - 1) {
          formattedEvents += "<hr class='my-5 border-t-2 border-gray-400'/>";
        }
      });

      setEventResults(formattedEvents);
      setStatusMessage(`Successfully retrieved ${pastEvents.length} past events.`);
      
    } catch (error: any) {
      console.error("Error fetching past events:", error);
      setStatusMessage("Error: Failed to fetch past events - " + (error.message || "Unknown error"));
      setEventResults("");
    }
  }

  // Function to read token balance for the connected account
  const getTokenBalance = async () => {
    if (!web3 || !contractAddr || !account) {
      setStatusMessage("Error: Web3, contract address, or account not available.");
      return;
    }

    try {
      setStatusMessage("Reading token balance...");
      const contractInstance = new web3.eth.Contract(abi, contractAddr);
      
      // Call the tokenBalance function from the smart contract
      const balance = await contractInstance.methods.tokenBalance(account).call();
      setTokenBalance(balance.toString());
      setStatusMessage(`Token balance retrieved: ${balance} tokens`);
      
    } catch (error: any) {
      console.error("Error reading token balance:", error);
      setStatusMessage("Error: Failed to read token balance - " + (error.message || "Unknown error"));
    }
  };

  // Function to send tokens using the smart contract
  const sendTokens = async () => {
    if (!web3 || !contractAddr || !account || !recipientAddress || !tokenAmount) {
      setStatusMessage("Error: Missing required information for token transfer.");
      return;
    }

    // Validate recipient address
    if (!web3.utils.isAddress(recipientAddress)) {
      setStatusMessage("Error: Invalid recipient address format.");
      return;
    }

    // Validate token amount
    const amount = parseInt(tokenAmount);
    if (isNaN(amount) || amount <= 0) {
      setStatusMessage("Error: Please enter a valid token amount.");
      return;
    }

    try {
      setStatusMessage("Sending tokens...");
      const contractInstance = new web3.eth.Contract(abi, contractAddr);
      
      // Send transaction using the sendTokens function
      const result = await contractInstance.methods.sendTokens(recipientAddress, amount).send({
        from: account,
        gas: 300000, // Adjust gas limit as needed
      });
      
      setStatusMessage(`Tokens sent successfully! Transaction hash: ${result.transactionHash}`);
      
      // Update token balance after successful transaction
      await getTokenBalance();
      
      // Clear form
      setRecipientAddress('');
      setTokenAmount('');
      
    } catch (error: any) {
      console.error("Error sending tokens:", error);
      setStatusMessage("Error: Failed to send tokens - " + (error.message || "Unknown error"));
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

      {isConnected && (
        <div className='mt-8 space-y-6'>
          {/* Token Balance Section */}
          <div className='text-center'>
            <div className='bg-blue-50 p-4 rounded-lg inline-block'>
              <h3 className='text-lg font-semibold mb-2'>Your Token Balance</h3>
              <div className='text-2xl font-bold text-blue-600'>{tokenBalance} tokens</div>
              <button 
                className='bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-400 mt-3 font-semibold disabled:bg-gray-400'
                onClick={getTokenBalance}
                disabled={!contractAddr}
              >
                Refresh Balance
              </button>
            </div>
          </div>

          {/* Send Tokens Section */}
          <div className='max-w-md mx-auto bg-gray-50 p-6 rounded-lg'>
            <h3 className='text-lg font-semibold mb-4 text-center'>Send Tokens</h3>
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Recipient Address
                </label>
                <input 
                  type="text" 
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  placeholder="0x..." 
                  className='w-full border border-gray-300 rounded-lg p-3 text-sm'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Token Amount
                </label>
                <input 
                  type="number" 
                  value={tokenAmount}
                  onChange={(e) => setTokenAmount(e.target.value)}
                  placeholder="Enter amount" 
                  className='w-full border border-gray-300 rounded-lg p-3'
                  min="1"
                />
              </div>
              <button 
                className='w-full bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-400 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed'
                onClick={sendTokens}
                disabled={!contractAddr || !recipientAddress || !tokenAmount}
              >
                Send Tokens
              </button>
            </div>
          </div>
        </div>
      )}

      <div className='flex items-center justify-center gap-x-5 mt-8'>
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
