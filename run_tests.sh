#!/bin/bash

## why use this testnet endpoint when you can sign up for free using this link? (be nice, and we both get 100$ in credit moneyies )
## https://alchemy.com/?r=e430c96d7492cf51 



read -n1 -p "Test locally or fork Mumbai? press [l]Locally, [m]Mumbai" option 
case $option
in
     m) npm install ;
        ganache-cli -f https://polygon-mumbai.g.alchemy.com/v2/uMH2G0KHfYWLBcH0SOdEbF97o64eGzSs -u 0xdCB67264d028bd19aC242962F2f56bDb041c02b9  & 
        truffle test --network forkedmumbai && kill -KILL $(jobs -p) ;
        echo "----YOU HAVE REACHED THE END-----" ;;
     
     l) npm install && truffle test && kill -9 $(jobs -p) ;;
        
     *) echo -n "no rush. take your time. choose wisely." ;;
esac

exit 0