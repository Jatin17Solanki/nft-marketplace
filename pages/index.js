import { ethers } from 'ethers';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Web3Modal from 'web3modal';

import { marketplaceAddress } from '../config';

import NFTMarketplace from '../artifacts/contracts/NFTMarketplace.sol/NFTMarketplace.json';

export default function Home() {

  const [nfts, setNfts] = useState([]);
  const [loadingState, setLoadingState] = useState('not-loaded')
  
  useEffect(() => {
    loadNFTs()
  }, [])

  async function loadNFTs() {

    //TODO: try using a web3provider
    //Create a generic provider and query for unsold items
    const provider = new ethers.providers.JsonRpcProvider("https://rpc-mumbai.matic.today");
    const contract = new ethers.Contract(marketplaceAddress, NFTMarketplace.abi, provider);
    const data = await contract.fetchUnsoldItems();

    /*
    data is essentially an array of MarketItems as defined in the smart contract.
    We will iterate through the array and format each item to get necessary details
    */
    const items = await Promise.all(data.map(async item => {
      const tokenUri = await contract.tokenURI(item.tokenId);
      const meta = await axios.get(tokenUri);
      let price = ethers.utils.formatUnits(item.price.toString(), 'ether');
      
      let marketItem = {
        price: price,
        tokenId: item.tokenId.toNumber(),
        seller: item.seller,
        owner: item.owner,
        image: meta.data.image,
        name: meta.data.name,
        description: meta.data.description,
      };
      return marketItem;
    }));

    setNfts(items);
    setLoadingState('loaded');
  }

  async function buyNft(nft) {
    
    const web3modal = new Web3Modal();
    const connection = await web3modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(marketplaceAddress, NFTMarketplace.abi, signer);

    const price = ethers.utils.parseUnits(nft.price.toString(), 'ether');
    const transaction = await contract.createMarketSale(nft.tokenId, {
      value: price
    });

    const transactionReciept = await transaction.wait();
    loadNFTs();
  }

  if (loadingState === 'loaded' && nfts.length === 0) 
    return (<h1 className="px-20 py-10 text-3xl">No items in marketplace</h1>)
  else
    return (
      <div className="flex justify-center">
        <div className="px-4" style={{ maxWidth: '1600px' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
            {
              nfts.map((nft, i) => (
                <div key={i} className="border shadow rounded-xl overflow-hidden">
                  <img src={nft.image} />
                  <div className="p-4">
                    <p style={{ height: '64px' }} className="text-2xl font-semibold">{nft.name}</p>
                    <div style={{ height: '70px', overflow: 'hidden' }}>
                      <p className="text-gray-400">{nft.description}</p>
                    </div>
                  </div>
                  <div className="p-4 bg-black">
                    <p className="text-2xl font-bold text-white">{nft.price} MATIC</p>
                    <button className="mt-4 w-full bg-pink-500 text-white font-bold py-2 px-12 rounded" onClick={() => buyNft(nft)}>Buy</button>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    )
  
}