
import { useEffect, useState } from 'react';
import { FiLogOut } from 'react-icons/fi';
import React from 'react';
// Generic Card component
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white shadow rounded-lg p-4 mb-4 ${className}`}>{children}</div>
);

// Section Card for headers or info
const SectionCard: React.FC<{ title: string; children?: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
  <Card className={`border-l-4 border-blue-400 ${className}`}>
    <div className="font-bold text-lg mb-2 text-blue-700">{title}</div>
    {children}
  </Card>
);

// Event Card for displaying event details
const EventCard: React.FC<{ event: any; index?: number; total?: number }> = ({ event, index, total }) => (
  <Card className="bg-gray-50">
    <div className="font-bold text-lg mb-2">Event: {event.event || 'Unknown'}</div>
    {typeof index === 'number' && typeof total === 'number' && (
      <div className="font-semibold text-base mb-2">Event {index + 1} of {total}</div>
    )}
    <div className="mb-1"><span className="font-semibold text-gray-700">Block Number:</span> <span className="text-gray-600">{event.blockNumber || 'N/A'}</span></div>
    <div className="mb-1"><span className="font-semibold text-gray-700">Transaction Hash:</span> <span className="text-gray-600 text-xs break-all">{event.transactionHash || 'N/A'}</span></div>
    <div className="mb-3"><span className="font-semibold text-gray-700">Contract Address:</span> <span className="text-gray-600 text-xs break-all">{event.address || 'N/A'}</span></div>
    {event.returnValues && (
      <>
        <div className="font-semibold mb-2">Event Data:</div>
        <Card className="bg-blue-50 ml-2">
          {Object.keys(event.returnValues).filter(key => isNaN(Number(key)) && key !== '__length__').map(key => (
            <div className="mb-1" key={key}>
              <span className="font-medium">{key}:</span> <span className="text-sm break-all">{typeof event.returnValues[key] === 'bigint' ? event.returnValues[key].toString() : event.returnValues[key]}</span>
            </div>
          ))}
        </Card>
      </>
    )}
    <div className="font-semibold mt-3 mb-2">Transaction Details:</div>
    <Card className="bg-orange-50 ml-2">
      <div className="mb-1"><span className="font-medium">Log Index:</span> <span>{event.logIndex || 'N/A'}</span></div>
      <div className="mb-1"><span className="font-medium">Transaction Index:</span> <span>{event.transactionIndex || 'N/A'}</span></div>
      <div className="mb-1"><span className="font-medium">Block Hash:</span> <span className="text-xs break-all">{event.blockHash || 'N/A'}</span></div>
    </Card>
  </Card>
);
import './App.css'

// Extend Window interface to include ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

function App() {
  const [account, setAccount] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [web3, setWeb3] = useState<any>(null);

  const [contractAddr] = useState<string>(import.meta.env.VITE_SMART_CONTRACT_ADDRESS || '');
  const [tokenBalance, setTokenBalance] = useState<string>('0');
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [tokenAmount, setTokenAmount] = useState<string>('');
  const [contract, setContract] = useState<any>(null);
  const [connectedToSmartContract, setConnectedToSmartContract] = useState<boolean>(false);
  const [authMessage, setAuthMessage] = useState<string>('Please connect to MetaMask to start using the app.');
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
    
        setIsConnected(true);

      
        setAuthMessage(`Connected to Account: ${accounts[0]}`)
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
  // Connect to smart contract when web3, account, and contractAddr are all available
  React.useEffect(() => {
    if (web3 && account && contractAddr) {
      try {
        setStatusMessage("Connecting to smart contract...");
        const contractInstance = new web3.eth.Contract(abi, contractAddr);
        setContract(contractInstance);
        setConnectedToSmartContract(true);
        setStatusMessage("Connected to smart contract successfully.");
      } catch (error: any) {
        console.error("Error connecting to smart contract:", error);
        setStatusMessage("Error: Failed to connect to smart contract - " + (error.message || "Unknown error"));
      }
    } else {
      setConnectedToSmartContract(false);
      setContract(null);
    }
  }, [web3, account, contractAddr]);

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


  // Store events as array instead of HTML string
  const [eventList, setEventList] = useState<any[]>([]);



  async function listenToEvents() {
    try {
      contract.events.TokensSent().on("data",
        (event: any) => {
          setEventList(prev => [event, ...prev]);
        });
      setStatusMessage("Listening to events on contract: " + contractAddr);
    } catch (error) {
      console.error("Error listening to events:", error);
      setStatusMessage("Error: Failed to listen to events.");
      setEventList([]);
    }
  }

  async function getAllPastEvents() {
    if (!web3 || !contractAddr) {
      setStatusMessage("Error: Web3 not initialized or contract address missing.");
      return;
    }

    try {
      setStatusMessage("Fetching past events...");
      setEventList([]);

      const currentBlock = await web3.eth.getBlockNumber();
      const fromBlock = Math.max(0, Number(currentBlock) - 1000);
      const pastEvents = await contract.getPastEvents('TokensSent', {
        fromBlock: fromBlock,
        toBlock: 'latest'
      });

      if (pastEvents.length === 0) {
        setEventList([]);
        setStatusMessage("Past events search completed - no events found.");
        return;
      }

      setEventList(pastEvents);
      setStatusMessage(`Successfully retrieved ${pastEvents.length} past events.`);
    } catch (error: any) {
      console.error("Error fetching past events:", error);
      setStatusMessage("Error: Failed to fetch past events - " + (error.message || "Unknown error"));
      setEventList([]);
    }
  }
function disconectFromMetamask() {
console.log("Disconnecting from MetaMask...");

  
      // Reset state variables
      setAccount('');
      setIsConnected(false);
      setWeb3(null);
      setTokenBalance('0');
      setContract(null);
      
      setConnectedToSmartContract(false);
      setStatusMessage('Disconnected from MetaMask.');
      setAuthMessage('Please connect to MetaMask to start using the app.');
    
  }

  // Function to read token balance for the connected account
  const getTokenBalance = async () => {
    if (!web3 || !contractAddr || !account) {
      setStatusMessage("Error: Web3, contract address, or account not available.");
      return;
    }

    try {

      // Call the tokenBalance function from the smart contract
      const balance = await contract.methods.tokenBalance(account).call();
      setTokenBalance(balance.toString());

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

      // Send transaction using the sendTokens function
      const result = await contract.methods.sendTokens(recipientAddress, amount).send({
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
      setStatusMessage("Failed to send tokens Insufficient balance or contract error");
    }
  };




  return (
    <div className='max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen'>
      <div className='text-4xl py-5 text-center font-bold ' >
        Welcome to the Vezo Wallet!
      </div>


      <img src="/Images/logo.png" alt="Logo" className='mx-auto  w-xs' />

      <div>
        <p className='text-center text-lg'>
        Wallet for Vezo Token  -           Explore the features and functionalities to manage your digital assets.

        </p>
        <p className='text-center text-lg'>
          Devoloped with ❤️ by Vezo Team
        </p>
      </div>


      <div className='flex flex-row items-center justify-center gap-4 mt-5'>
        <button
          className='bg-blue-500 text-white px-4 flex items-center justify-center rounded-2xl py-2 hover:bg-blue-400 cursor-pointer'
          onClick={connectToMetaMask}
          disabled={isConnected}
        >
          <span className='font-semibold text-xl'>
            {isConnected ? 'Connected to MetaMask' : 'Connect With MetaMask'}
          </span>
          <img src="/Images/metamask.png" alt="MetaMask Logo" className='object-contain w-[100px]' />
        </button>
        {isConnected && (
          <button
            className='bg-red-500 text-white w-10 h-10 rounded-lg hover:bg-red-400 cursor-pointer flex items-center justify-center ml-2'
            title='Logout'
            onClick={disconectFromMetamask}
            disabled={!isConnected}
          >
            <FiLogOut size={24} />
          </button>
        )}
      </div>



      
      <div className='text-center mt-5 text-lg'>
        {authMessage}
      </div>

      <div className='text-center mt-5 text-lg'>
        {statusMessage}
      </div>


      
      <div className='flex items-center justify-center gap-x-5 mt-5  flex-col lg:flex-row gap-y-[20px] '>



        <button
          className='bg-green-500 text-white px-6 py-3 rounded-lg  hover:bg-green-400 cursor-pointer font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed'
          onClick={listenToEvents}
          disabled={!isConnected || !connectedToSmartContract}
        >
          Listen to Events
        </button>
        <button
          className='bg-purple-500 text-white px-6 py-3  rounded-lg hover:bg-purple-400 cursor-pointer font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed'
          onClick={getAllPastEvents}
          disabled={!isConnected || !connectedToSmartContract}
        >
          Get Past Events
        </button>
      </div>


      {(eventList.length > 0 || statusMessage) && (
        <div className='my-8 mx-4'>
          <h3 className='text-xl font-semibold text-center mb-4'>Event Results:</h3>
          {eventList.length > 0 ? (
            <SectionCard title={`Found ${eventList.length} Past Events`} className="bg-green-100 text-green-800 text-center" />
          ) : null}
          <div className='max-h-96 overflow-y-auto text-sm'>
            {eventList.length > 0 ? (
              eventList.map((event, idx) => (
                <React.Fragment key={event.id || event.transactionHash || idx}>
                  <EventCard event={event} index={idx} total={eventList.length} />
                  {idx < eventList.length - 1 && <hr className='my-5 border-t-2 border-gray-400' />}
                </React.Fragment>
              ))
            ) : (
              <Card className="bg-gray-100 text-gray-700 text-center">No events found.</Card>
            )}
          </div>
        </div>
      )}

      {isConnected && (
        <div className='mt-8 space-y-6'>
          {/* Token Balance Section */}
          <div className='text-center'>
            <div className='bg-blue-50 p-4 rounded-lg inline-block'>
              <h3 className='text-lg font-semibold mb-2'>Your Token Balance</h3>
              <div className='text-2xl font-bold text-blue-600'>{tokenBalance} tokens</div>
              <button
                className='bg-blue-500 text-white px-4 py-2 cursor-pointerrounded-lg hover:bg-blue-400 mt-3 font-semibold disabled:bg-gray-400'
                onClick={getTokenBalance}
                disabled={!connectedToSmartContract}
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
                className='w-full bg-red-500 cursor-pointer text-white px-6 py-3 rounded-lg hover:bg-red-400 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed'
                onClick={sendTokens}
                disabled={!contractAddr || !recipientAddress || !tokenAmount || !connectedToSmartContract}
              >
                Send Tokens
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default App
