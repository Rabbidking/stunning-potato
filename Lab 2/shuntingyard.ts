import { Token } from "./Token"
import { Tokenizer } from "./Tokenizer"
import { Grammar } from "./Grammar"

var operandStack = [];
var operatorStack = [];
let grammar: Grammar;
let tokenizer: Tokenizer;

class TreeNode {
	sym: string;
	token: Token;
	children: TreeNode[];
	constructor(sym: string, token: Token) {
		this.sym = sym;
		this.token = token;
		this.children = [];
	}

	addChild(child: TreeNode) {
		this.children.push(child);
	}
}

function associativity(operator: string): string {
	//determine left or right associativity (POWOP, NEGATE and BITNOT are right associative)
	if (operator == "POWOP" || operator == "BITNOT" || operator == "NEGATE") {
		return "right";
	}
	else {
		return "left";
	}
}

function arity(operator: string): number {
	//left or right precedence of comma/negation
	if (operator == "BITNOT" || operator == "NEGATE")
		return 1;
	else
		return 2;
}

function precedence(operator: string): number {
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
	let c1: TreeNode = operandStack.pop();
	let opNode: TreeNode = operatorStack.pop();
	if (arity(opNode.sym) == 2) {
		let c2: TreeNode = operandStack.pop();
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
	grammar = new Grammar(gram);
}


export function parse(input: string): TreeNode {
	let p = null;
	setGrammar();
	tokenizer = new Tokenizer(grammar);
	tokenizer.setInput(input);

	while (true) {

		var t = tokenizer.next();

		//transform the MINUS operator to NEGATE before doing anything else
		if (t.lexeme == "-") {
			if (p == null || p == "LPAREN" || p == precedence(p)) {
				t.sym = "NEGATE";
			}
		}

		//EOF
		if (t.sym == "$") {
			break;
		}

		let sym = t.sym;

		console.log(sym);

		//make new TreeNodes and push them onto the operatorStack
		if (t.sym == "NUM" || t.sym == "ID" || t.sym == "LPAREN" || t.sym == "NEGATE" || t.sym == "BITNOT") {
			console.log("Pushing child node to stack...");
			operandStack.push(new TreeNode(t.sym, t));
		}

		//we're at the end of our statement, so we start popping operators off and do the operations, walking up the tree
		else if (sym == "RPAREN") {
			while (operatorStack[operatorStack.length - 1].sym != "LPAREN") {
				doOperation();
			}

			let tempVal = operatorStack.pop();
			operandStack.push(tempVal);

			if (p.sym == "LPAREN" && operandStack[operandStack.length - 1].sym == "ID") {
				let opNode: TreeNode = tempVal;
				let child: TreeNode = operandStack.pop();
				opNode.addChild(child);
				operandStack.push(opNode);
			}
		}

		else {
			operatorStack.push(sym);
			let assoc = associativity(sym);

			if (sym == "LPAREN" && p != null && p == "ID") {
				//push func-call to treeNode
				operatorStack.push(new TreeNode("FUNC-CALL", null));
			}

			while (assoc != "right" || arity(sym) != 1) {
				//if nothing's on our stack, break
				if (operatorStack.length == 0) {
					console.log("nothing on the stack")
					break;
				}

				let A = operatorStack.pop();
				operatorStack.push(A);
				if (assoc == "left" && precedence(A.sym) >= precedence(t.sym)) {
					console.log("left precedence")
					//console.log(A)
					doOperation();
				}
				else if (assoc == "right" && precedence(A.sym) > precedence(t.sym)) {
					console.log("right precedence")
					//console.log(A)
					doOperation();
				}
				else {
					break;
				}

			}

			console.log("pushing new TreeNode to stack")
			operandStack.push(new TreeNode(t.sym, t));
		}
		//operatorStack.push(new TreeNode(t.sym, t));
		console.log("Tracking previously used token..\n")
		p = t;
	}

	while (operatorStack.length > 0) {
		//console.log("operatorStack: " + operatorStack)
		doOperation();

	}

	return operandStack.pop();
}