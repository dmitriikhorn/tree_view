# YANG Tree View

The code in this repo is for visualization of Nokia YANG model as a tree graph and a search through this model via Elastic engine.

YANG model must be represented as a SQLite database:

    sqlite> PRAGMA table_info(yang_models);
    0|id|INTEGER|1||1
    1|name|varchar(50)|1||0
    2|type|varchar(50)|1||0
    3|description|varchar(50)|0||0
    4|parent_id|bigint|0||0


And placed in a project root directory. For example:

    const db = await open({
        filename: "sros_20_10.sqlite3",
        driver: sqlite3.Database
    });


Install dependencies

    npm install

To run Elastic search in a container:

    sudo docker run -d -p 9200:9200 -e "discovery.type=single-node" -e "xpack.security.enabled=false" --name elastic_search elasticsearch:9.2.0

To sync up database with Elastic:

    node elasticSync.js
