// Simple Oracle for Demo - Resolves markets automatically
const { ethers } = require('ethers');

// Contract setup
const ARBITRUM_RPC = 'https://sepolia-rollup.arbitrum.io/rpc';
const PREDICTION_MARKET = '0x759449068AD81E04FD223fe0F1Da790F17426204';
const ORACLE_RESOLVER = '0xfE1757e4E3C6050d592b54A3060ED3A47eaCA898';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const ORACLE_ABI = [
  "function submitResolution(uint256 _marketId, uint8 _outcome, uint256 _confidence) external"
];

const MARKET_ABI = [
  "function resolveMarket(uint256 _marketId, uint8 _outcome) external"
];

const oracleContract = new ethers.Contract(ORACLE_RESOLVER, ORACLE_ABI, wallet);
const marketContract = new ethers.Contract(PREDICTION_MARKET, MARKET_ABI, wallet);

// Data feeds for different market types
const DATA_FEEDS = {
  bitcoin: async () => {
    try {
      const response = await fetch('https://api.coindesk.com/v1/bpi/currentprice.json');
      const data = await response.json();
      const price = data.bpi.USD.rate_float;
      return {
        value: price,
        confidence: price > 50000 ? 95 : 85 // Higher confidence for higher prices
      };
    } catch (error) {
      console.log('Bitcoin API failed, using mock data');
      return { value: 67000, confidence: 90 }; // Mock for demo
    }
  },
  
  weather: async () => {
    // Mock weather data for demo
    const willRain = Math.random() > 0.6; // 40% chance of rain
    return {
      value: willRain,
      confidence: 85
    };
  },
  
  ethereum: async () => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      const data = await response.json();
      const price = data.ethereum.usd;
      return {
        value: price,
        confidence: 92
      };
    } catch (error) {
      console.log('Ethereum API failed, using mock data');
      return { value: 2800, confidence: 88 }; // Mock for demo
    }
  }
};

// Market resolution logic
const RESOLUTION_RULES = {
  0: { // Bitcoin $100k market
    feed: 'bitcoin',
    condition: (value) => value >= 100000,
    description: 'Bitcoin hits $100,000'
  },
  1: { // Rain in NY market
    feed: 'weather', 
    condition: (value) => value === true,
    description: 'Rain in New York'
  },
  2: { // Ethereum $3k market
    feed: 'ethereum',
    condition: (value) => value >= 3000,
    description: 'Ethereum above $3000'
  }
};

async function resolveMarket(marketId) {
  try {
    const rule = RESOLUTION_RULES[marketId];
    if (!rule) {
      console.log(`No resolution rule for market ${marketId}`);
      return;
    }

    console.log(`🔍 Checking market ${marketId}: ${rule.description}`);
    
    // Get data from feed
    const feedData = await DATA_FEEDS[rule.feed]();
    console.log(`📊 Feed data:`, feedData);
    
    // Determine outcome
    const outcome = rule.condition(feedData.value) ? 0 : 1; // 0 = YES, 1 = NO
    const outcomeText = outcome === 0 ? 'YES' : 'NO';
    
    console.log(`📈 Resolution: ${outcomeText} (confidence: ${feedData.confidence}%)`);
    
    if (feedData.confidence >= 80) {
      // Submit resolution via oracle
      console.log(`🤖 Submitting oracle resolution...`);
      const tx1 = await oracleContract.submitResolution(
        marketId,
        outcome, 
        feedData.confidence
      );
      await tx1.wait();
      console.log(`✅ Oracle resolution submitted: ${tx1.hash}`);
      
      // Direct market resolution (for demo speed)
      console.log(`⚡ Resolving market directly...`);
      const tx2 = await marketContract.resolveMarket(marketId, outcome);
      await tx2.wait();
      console.log(`🎯 Market ${marketId} resolved as ${outcomeText}!`);
      console.log(`🔗 Resolution tx: ${tx2.hash}`);
      
    } else {
      console.log(`❌ Confidence too low (${feedData.confidence}%), skipping resolution`);
    }
    
  } catch (error) {
    console.error(`Error resolving market ${marketId}:`, error.message);
  }
}

// Demo resolver - runs every 30 seconds
async function runDemo() {
  console.log(`🚀 ArbiTruth Oracle System Starting...`);
  console.log(`🔗 Connected to: ${ARBITRUM_RPC}`);
  console.log(`📊 Markets to monitor: 0, 1, 2`);
  console.log(`⏰ Check interval: 30 seconds\n`);
  
  let checkCount = 0;
  
  const interval = setInterval(async () => {
    checkCount++;
    console.log(`\n🔄 Check #${checkCount} - ${new Date().toLocaleTimeString()}`);
    
    // Check all markets
    for (let marketId = 0; marketId < 3; marketId++) {
      await resolveMarket(marketId);
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2s between markets
    }
    
    // For demo, resolve one market after 3 checks and stop
    if (checkCount >= 3) {
      console.log(`\n🎬 Demo complete! Market should be resolved.`);
      clearInterval(interval);
    }
    
  }, 30000); // Every 30 seconds
  
  // Initial check
  console.log(`🔄 Initial check - ${new Date().toLocaleTimeString()}`);
  await resolveMarket(2); // Resolve Ethereum market for demo
}

// Start the oracle
runDemo().catch(console.error);