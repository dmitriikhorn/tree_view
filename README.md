# YANG Tree View

Install dependencies

>npm install

To run Elastic search in a container:

>sudo docker run -d -p 9200:9200 -e "discovery.type=single-node" -e "xpack.security.enabled=false" --name elastic_search elasticsearch:9.2.0

Sync up database (move DB beforehand)

>node elasticSync.js
