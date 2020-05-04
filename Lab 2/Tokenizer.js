"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Token_1 = require("./Token");
//this is a comment
class Tokenizer {
    //previous: Token
    //current: Token
    constructor(grammar) {
        this.grammar = grammar;
        this.lineNumber = 1;
        this.idx = 0;
    }
    setInput(inputData) {
        //...prepare for new parse...
        this.inputData = inputData;
        //console.log(inputData);
        this.lineNumber = 1;
        this.idx = 0;
    }
    next() {
        //whitespace and new line checks
        while (this.inputData.charAt(this.idx) == '\n') {
            //specific new line check
            if (this.inputData[this.idx].includes('\n')) {
                this.lineNumber++;
            }
            this.idx++;
        }
        if (this.idx >= this.inputData.length - 1) {
            //special "end of file" metatoken
            return new Token_1.Token("$", undefined, this.lineNumber);
        }
        for (let sym of this.grammar.productions.keys()) {
            let rex = this.grammar.productions.get(sym); //RegExp coresponding to key
            rex.lastIndex = this.idx; //tell where to start searching
            let m = rex.exec(this.inputData); //do the search
            if (m) {
                //console.log(m.index, this.idx);
                this.idx += m[0].length;
                //m[0] contains matched text as string
                let lexeme = m[0];
                let tempLine = this.lineNumber;
                let newLineCount = 0;
                for (let char of lexeme) {
                    if (char == '\n') {
                        newLineCount++;
                    }
                }
                this.lineNumber += newLineCount;
                if (sym !== "WHITESPACE" && sym !== "COMMENT") {
                    //return new Token using sym, lexeme, and line number
                    return new Token_1.Token(sym, lexeme, tempLine);
                }
                else {
                    //skip whitespace and get next real token
                    return this.next();
                }
            }
        }
        //no match; syntax error
        throw new Error("No matches found!");
    }
}
exports.Tokenizer = Tokenizer;
//# sourceMappingURL=Tokenizer.js.map