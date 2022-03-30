import SwaggerClient from 'swagger-client';
let client = await SwaggerClient("http://localhost:1337/furz");


/* let test = new Array(
    async function
); */



async function getAllArticleTest() {
    let result = await client.apis.artikel.get_api_artikel();
    console.log("getAllArticleTest: " + ((result.status == 200)? "ok" : "not ok"));
}

//beten
async function deleteAllArticleTest(){
    try{
        let result = await client.apis.artikel.delete_api_artikel();
        console.log("deleteAllArticleTest: " + ((result.status == 204)? "ok" : "not ok"));
    }catch {
        console.log("deleteAllArticleTest: not ok");
    };
}

async function deleteAllArticleWhenListEmtyTest(){
    try{
        let result = await client.apis.artikel.delete_api_artikel();
        console.log("deleteAllArticleTest: not ok");
    }catch (result){
        console.log("deleteAllArticleTest: " + ((result.status == 404)? "ok" : "not ok"));
    };
}





await getAllArticleTest();
await deleteAllArticleTest();
await deleteAllArticleWhenListEmtyTest();