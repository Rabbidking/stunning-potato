"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Tokenizer_1 = require("./Tokenizer");
const Grammar_1 = require("./Grammar");
var operandStack = [];
var operatorStack = [];
let grammar;
let tokenizer;
class TreeNode {
    constructor(sym, token) {
        this.sym = sym;
        this.token = token;
        this.children = [];
    }
    addChild(child) {
        this.children.push(child);
    }
}
function associativity(operator) {
    //determine left or right associativity (POWOP, NEGATE and BITNOT are right associative)
    if (operator == "POWOP" || operator == "BITNOT" || operator == "NEGATE") {
        return "right";
    }
    else {
        return "left";
    }
}
function arity(operator) {
    //left or right precedence of comma/negation
    if (operator == "BITNOT" || operator == "NEGATE")
        return 1;
    else
        return 2;
}
function precedence(operator) {
    //sort the operators by order of precedence, then return its value
    switch (operator) {
        case "FUNC-CALL":
            return 7;
        case "POWOP":
            return 6;
        case "BITNOT":
            return 5;
        case "NEGATE":
            return 4;
        case "MULOP":
            return 3;
        case "ADDOP":
            return 2;
        case "COMMA":
            return 1;
        default:
            return 0;
    }
}
function doOperation() {
    let c1 = operandStack.pop();
    let opNode = operatorStack.pop();
    if (arity(opNode.sym) == 2) {
        let c2 = operandStack.pop();
        opNode.addChild(c2);
    }
    opNode.addChild(c1);
    operandStack.push(opNode);
}
function setGrammar() {
    let gram = "";
    gram += "NUM -> \\d+\n";
    gram += "ID -> \\w+\n";
    gram += "COMMA -> [,]\n";
    gram += "ADDOP -> [-+]\n";
    gram += "POWOP -> [*][*]\n";
    gram += "MULOP -> [*/]\n";
    gram += "BITNOT -> [~]\n";
    gram += "LPAREN -> [(]\n";
    gram += "RPAREN -> [)]\n";
    grammar = new Grammar_1.Grammar(gram);
}
function parse(input) {
    let p = null;
    setGrammar();
    tokenizer = new Tokenizer_1.Tokenizer(grammar);
    tokenizer.setInput(input);
    //let prev = tokenizer.previousToken();
    while (true) {
        let t = tokenizer.next();
        let prev = tokenizer.previousToken();
        //operandStack.pop();
        //transform the MINUS operator to NEGATE before doing anything else
        if (t.lexeme == "-") {
            if (p == null || p == "LPAREN") {
                t.sym = "NEGATE";
            }
        }
        //EOF
        if (t.sym == "$") {
            break;
        }
        let sym = t.sym;
        console.log(t);
        //make new TreeNodes and push them onto the operatorStack
        if (sym == "SUM" || sym == "ID") {
            operandStack.push(new TreeNode(t.sym, t));
            console.log(operandStack);
        }
        //we're at the end of our statement, so we start popping operators off and do the operations, walking up the tree
        else if (sym == "RPAREN") {
            while (operatorStack[operatorStack.length - 1].sym != "LPAREN") {
                doOperation();
            }
            let tempVal = operatorStack.pop();
            if (t.sym == "LPAREN" && operandStack[operandStack.length - 1].sym == "ID") {
                let opNode = tempVal;
                let child = operandStack.pop();
                opNode.addChild(child);
                operandStack.push(opNode);
            }
        }
        else {
            let assoc = associativity(sym);
            if (sym == "LPAREN" && t != null && t.sym == "ID") {
                //push func-call to treeNode
                operatorStack.push(new TreeNode("FUNC-CALL", null));
            }
            while (assoc != "right" || arity(sym) != 1) {
                //if nothing's on our stack, break
                if (operatorStack.length == 0) {
                    break;
                }
                let A = operatorStack.pop();
                if (assoc == "left" && precedence(A.sym) >= precedence(t.sym)) {
                    doOperation();
                }
                else if (assoc == "right" && precedence(A.sym) > precedence(t.sym)) {
                    doOperation();
                }
                else {
                    break;
                }
            }
            operandStack.push(new TreeNode(t.sym, t));
        }
        p = t;
    }
    while (operatorStack.length > 0) {
        doOperation();
    }
    return operandStack.pop();
}
exports.parse = parse;
//# sourceMappingURL=shuntingyard.js.map