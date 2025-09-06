import fs, { mkdir } from 'fs';
import path from "path";
import superagent from 'superagent'; //for making http calls
import { getPageLinks, urlToFilename } from "./utils.js";

//we will create a web spider, a command-line 
//application that takes in a web URL, depth of recursion as input and downloads its contents locally into 
//a file, till the depth specified, recursively trying out all links.
//execute using spider-cli.js

function saveFile(filename, contents, cb){
    mkdir(path.dirname(filename),{recursive: true}, (err)=>{
        if(err){
            return cb(err);
        }
        fs.writeFile(filename, contents, cb);
    })
}

function download(url, filename, cb){
    console.log(`Downloading ${url}`);
    superagent.get(url).end((err,res)=>{
        if(err){
            return cb(err);
        }

        saveFile(filename, res.text, err=>{
            if(err){
                return cb(err);
            }

            console.log(`Downloaded and saved: ${url}`)
            cb(null, res.text);
        })
    })
}

function spiderLinks(currentUrl, body, nesting, cb){

    if(nesting === 0){ //no more recursion 
        return process.nextTick(cb);
        //we cannot directly call cb() (migh cause zalgo bug, if it's async)
    }

    const links = getPageLinks(currentUrl, body);
    if(links.length === 0){
        return process.nextTick(cb);
    }
    
    function iterate(index){
        if(index === links.length){
            return cb();
            //invoking immediately since all elements have been processed
        }
        
        spider(links[index], nesting-1, function (err){
            if(err){
                return cb(err);
            }
            iterate(index+1);
        })
    }

    iterate(0);
}

export function spider(url, nesting, cb){

    const filename = urlToFilename(url);
    fs.readFile(filename, 'utf8', (err,fileContent)=>{
        if(err){
            if(err.code !== 'ENOENT'){
                return cb(err);
            }
            
            //File does not exist, download
            return download(url, filename, (err,requestContent)=>{
                if(err){
                    return cb(err);
                }                

                spiderLinks(url, requestContent, nesting, cb);
            })
        }

        //File exists already, process the links
        spiderLinks(url, fileContent, nesting, cb);
    }) 
}
//NOTE: when you return an async function it does not mean anything,
//what it does is that it executes the code and then simply exits the function
