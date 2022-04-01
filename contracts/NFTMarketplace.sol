// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

import "hardhat/console.sol";

contract NFTMarketplace is ERC721URIStorage{
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    Counters.Counter private _itemsSold;
    Counters.Counter private _noOfSales;

    address payable marketPlaceOwner;
    uint256 listingFee = 0.05 ether;

    mapping(uint256 => MarketItem) private idToMarketItem;

    constructor() ERC721("Jat17 Tokens", "J17"){
        marketPlaceOwner = payable(msg.sender);
    }

    struct MarketItem {
        uint256 tokenId;
        address seller;
        address owner;
        uint256 price;
        bool sold;
    }
    
    event MarketItemCreated (
      uint256 indexed tokenId,
      address seller,
      address owner,
      uint256 price,
      bool sold
    );

    function getContractBalance() public view returns(uint256) {
        require(marketPlaceOwner == msg.sender, "Only owner can access");
        return address(this).balance;
    }

    function getNoOfSales() public view returns(uint256) {
        require(marketPlaceOwner == msg.sender, "Only owner can access");
        return _noOfSales.current();
    }

    function payDay() public payable returns(uint256) {
        require(marketPlaceOwner == msg.sender, "Only owner can access");
        uint256 commission = address(this).balance;
        marketPlaceOwner.transfer(commission);
        return commission;
    }

    function getListingFee() public view returns(uint256) {
        return listingFee;
    }

    function updateListingFee(uint256 _updatedFee) public {
        require(marketPlaceOwner == msg.sender, "Only the market place owner can update the listing price");
        listingFee = _updatedFee;
    }

    //Creates a new NFT and lists it for sale at the price passed as argument
    //This function as to be called by paying a listing fee
    function createToken(string memory _tokenURI, uint256 _price) public payable returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        //ERC721
        _mint(msg.sender, newTokenId); 

        //ERC721URIStorage
        _setTokenURI(newTokenId, _tokenURI);

        createMarketItem(newTokenId, _price);
        return newTokenId;
    }

    function createMarketItem(uint256 _tokenId, uint256 _price) private {
        require(_price > 0, "Price must be at least 1 wei");
        require(msg.value == listingFee, "Please pay sufficient listing fee!");

        MarketItem memory item = MarketItem({
            tokenId: _tokenId,
            seller: payable(msg.sender),
            owner: payable(address(this)),
            price: _price,
            sold: false
        });

        idToMarketItem[_tokenId] = item;

        //TODO: safetransfer and setapproval check please
        //transfers ownership of token from seller to the marketplace
        _transfer(msg.sender, address(this), _tokenId);

        emit MarketItemCreated(
            _tokenId,
            msg.sender,
            address(this),
            _price,
            false
        );
    }

    function resellToken(uint256 tokenId, uint256 price) public payable{
        require(tokenId <= _tokenIds.current(), "Cannot resell a token that does not exist");
        require(idToMarketItem[tokenId].sold == true, "Cannot resell a token that has already been listed for sale");
        require(idToMarketItem[tokenId].owner == msg.sender, "Only the owner can resell this token");
        require(msg.value == listingFee, "Please pay adequate listing fee to complete the transaction");
        require(price > 0, "Selling price must be atleast 1 wei!");

        //Update values
        idToMarketItem[tokenId].price = price;
        idToMarketItem[tokenId].seller = payable(msg.sender);
        idToMarketItem[tokenId].owner = payable(address(this));
        idToMarketItem[tokenId].sold = false;
        _itemsSold.decrement();

        //transfer
        _transfer(msg.sender, address(this), tokenId);
    }

    //creates the sale of a marketplace item
    function createMarketSale(uint256 tokenId) public payable {
        MarketItem storage itemToBeSold = idToMarketItem[tokenId];
        address seller = itemToBeSold.seller;
        uint256 price = itemToBeSold.price;

        require(price == msg.value, "Please pay the required amount to purchase this item");
        require(seller != msg.sender, "Seller cannot purchase an item he owns");

        //update the values
        itemToBeSold.owner = payable(msg.sender);
        itemToBeSold.sold = true;
        itemToBeSold.seller = payable(address(0));
        _itemsSold.increment();
        _noOfSales.increment();

        //Transfer ownership of token from marketplace to the buyer
        _transfer(address(this), msg.sender, tokenId);

        payable(seller).transfer(msg.value);
    }

    //Returns all unsold market items
    function fetchUnsoldItems() public view returns(MarketItem[] memory){
        uint256 itemCount = _tokenIds.current();
        uint256 unsoldItemCount = _tokenIds.current() - _itemsSold.current();
        uint256 curIndex = 0;

        MarketItem[] memory unsoldItems = new MarketItem[](unsoldItemCount);

        //traverse through the idtomarketitem map and extract unsold item
        for(uint i = 1; i <= itemCount; i++) {
            if(idToMarketItem[i].owner == address(this)){
                unsoldItems[curIndex] = idToMarketItem[i];
                curIndex += 1;
            }
        }

        return unsoldItems;
    }
    
    //Returns all tokens owner by the function caller
    function fetchMyNFTs() public view returns(MarketItem[] memory){
        uint256 totalItemCount = _tokenIds.current();
        uint256 itemCount = 0;
        uint256 curIndex = 0;

        //1. Count the no of nfts owned
        for(uint256 i = 1; i <= totalItemCount; i++) {
            if(idToMarketItem[i].owner == msg.sender)
                itemCount += 1;
        }

        //2. Create an array
        MarketItem[] memory myItems = new MarketItem[](itemCount);

        //3. Extract my items
        for(uint256 i = 1; i <= totalItemCount; i++) {
            if(idToMarketItem[i].owner == msg.sender) {
                myItems[curIndex] = idToMarketItem[i];
                curIndex += 1;
            }
        }

        return myItems;
    }

    //Returns all tokens listed by the function caller for sale
    function fetchItemsListed() public view returns(MarketItem[] memory){
        uint256 totalItemCount = _tokenIds.current();
        uint256 itemCount = 0;
        uint256 curIndex = 0;

        //1. Count the no of nfts owned
        for(uint256 i = 1; i <= totalItemCount; i++) {
            if(idToMarketItem[i].seller == msg.sender)
                itemCount += 1;
        }

        //2. Create an array
        MarketItem[] memory myItems = new MarketItem[](itemCount);

        //3. Extract my items
        for(uint256 i = 1; i <= totalItemCount; i++) {
            if(idToMarketItem[i].seller == msg.sender) {
                myItems[curIndex] = idToMarketItem[i];
                curIndex += 1;
            }
        }

        return myItems;
    }
}