"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Grammar {
    constructor(grammar) {
        this.terminals = new Map();
        let lineArray = grammar.split("\n"); //array of \n chars seperates each line
        //for loop here, put grammars into the set
        for (let i = 0; i < lineArray.length - 1; i++) {
            let symArray = lineArray[i].split("->"); //array of left/right symbols separated by the arrow
            let wsArray = symArray[0].trim(); //trims whitespace characters from regexes (store these somewhere)
            let ws2 = symArray[1].trim();
            if (this.terminals.has(wsArray))
                throw Error("Duplicate type!");
            else {
                try {
                    let rex = new RegExp(ws2, "gy");
                    this.terminals.set(wsArray, rex);
                }
                catch (_a) {
                    throw Error("Invalid regex!");
                }
            }
        }
        if (!this.terminals.has("WHITESPACE")) {
            let reg = new RegExp("\\s+", "gy");
            this.terminals.set("WHITESPACE", reg);
        }
    }
}
exports.Grammar = Grammar;
//# sourceMappingURL=Grammar.js.map