class MLIRTokenizer {
  constructor(input) {
    this.input = input;
    this.position = 0;
  }

  next() {
    this.consumeWhitespaceAndComments();

    if (this.position >= this.input.length) {
      return null;
    }

    const char = this.input.charAt(this.position);
    const nextChar = this.peekNext();

    console.log(`Current char: ${char}, Next char: ${nextChar}`);

    if (char === '"') {
      return this.consumeString();
    } else if (char === '%') {
      return this.consumeVariable();
    } else if (char === '^') {
      return this.consumeBlock();
    } else if (char === '@' || (/[a-zA-Z_]/.test(char) && nextChar === '@')) {
      return this.consumeFunction();
    } else if (/[a-zA-Z_]/.test(char)) {
      return this.consumeKeywordOrModule();
    } else {
      return this.consumeOperator();
    }
  }

  peekNext() {
    const nextPosition = this.position + 1;
    return nextPosition < this.input.length ? this.input.charAt(nextPosition) : null;
  }

  consumeWhitespaceAndComments() {
    while (this.position < this.input.length) {
      const char = this.input.charAt(this.position);
      if (/\s/.test(char)) {
        this.position++;
      } else if (char === '/' && this.input.charAt(this.position + 1) === '/') {
        this.consumeLineComment();
      } else if (char === '/' && this.input.charAt(this.position + 1) === '*') {
        this.consumeBlockComment();
      } else {
        break;
      }
    }
  }

  consumeLineComment() {
    while (this.position < this.input.length && this.input.charAt(this.position) !== '\n') {
      this.position++;
    }
  }

  consumeBlockComment() {
    this.position += 2; // Skip the initial '/*'

    while (this.position < this.input.length - 1) {
      if (this.input.charAt(this.position) === '*' && this.input.charAt(this.position + 1) === '/') {
        this.position += 2;
        break;
      } else {
        this.position++;
      }
    }
  }

  consumeString() {
    let value = "";
    this.position++; // Skip the initial '"'

    while (this.position < this.input.length && this.input.charAt(this.position) !== '"') {
      value += this.input.charAt(this.position);
      this.position++;
    }

    this.position++; // Skip the final '"'
    return { type: "string", value };
  }

  consumeVariable() {
    let value = "";
    this.position++; // Skip the initial '%'

    while (this.position < this.input.length && /[\w\d]/.test(this.input.charAt(this.position))) {
      value += this.input.charAt(this.position);
      this.position++;
    }

    return { type: "variable", value };
  }

  consumeBlock() {
    let value = "";
    this.position++; // Skip the initial '^'

    while (this.position < this.input.length && /[\w\d]/.test(this.input.charAt(this.position))) {
      value += this.input.charAt(this.position);
      this.position++;
    }

    return { type: "block", value };
  }

  consumeFunction() {
    let value = "";
    this.position++; // Skip the initial '@'

    while (this.position < this.input.length && /[\w\d]/.test(this.input.charAt(this.position))) {
      value += this.input.charAt(this.position);
      this.position++;
    }

    return { type: "function", value };
  }

  consumeKeywordOrModule() {
    let value = "";
    while (this.position < this.input.length && /[\w\d._<>-]/.test(this.input.charAt(this.position))) {
      value += this.input.charAt(this.position);
      this.position++;
    }

    if (value === "module") {
      return { type: "module", value };
    } else {
      return { type: "keyword", value };
    }
  }

  consumeOperator() {
    let value = "";
    while (this.position < this.input.length && /[:<>,->()]/.test(this.input.charAt(this.position))) {
      value += this.input.charAt(this.position);
      this.position++;
    }

    return { type: "operator", value };
  }
}


class MLIRParser {
  constructor(input) {
    this.tokenizer = new MLIRTokenizer(input);
    this.module = {
      functions: [],
    };
    this.currentFunction = null;
  }

  parse() {
    let token;

    while ((token = this.tokenizer.next())) {
      if (token.type === "module") {
        this.parseModule();
      } else if (token.type === "keyword" && token.value === "func") {
        this.parseFunction();
      } else {
        throw new Error(`Unexpected token: ${JSON.stringify(token)}`);
      }
    }

    return this.module;
  }

  parseModule() {
    let token;

    while ((token = this.tokenizer.next())) {
      if (token.type === "keyword" && token.value === "func") {
        this.parseFunction();
      } else {
        break;
      }
    }
  }

  parseFunction() {
    const nameToken = this.tokenizer.next();
    if (nameToken.type !== "function") {
      throw new Error(`Expected function name, got: ${JSON.stringify(nameToken)}`);
    }

    const func = {
      name: nameToken.value,
      inputs: this.parseFunctionArgs(),
      returnType: this.parseFunctionReturnType(),
      body: [],
    };

    this.currentFunction = func;
    this.functions.push(func);

    // Function body parsing can be implemented here
    // e.g., this.parseFunctionBody();
  }

  parseFunctionArgs() {
    const args = [];

    // consume '('
    const openParenToken = this.tokenizer.next();
    if (openParenToken.type !== "string" || openParenToken.value !== "(") {
      throw new Error(`Expected '(', got: ${JSON.stringify(openParenToken)}`);
    }

    while (true) {
      const argToken = this.tokenizer.next();
      if (argToken.type === "string" && argToken.value === ")") {
        break;
      }

      if (argToken.type !== "variable") {
        throw new Error(`Expected variable, got: ${JSON.stringify(argToken)}`);
      }

      const typeToken = this.tokenizer.next();
      if (typeToken.type !== "string" || typeToken.value !== ":") {
        throw new Error(`Expected ':', got: ${JSON.stringify(typeToken)}`);
      }

      const type = this.parseType();
      args.push({ name: argToken.value, type });

      const nextToken = this.tokenizer.next();
      if (nextToken.type === "string" && nextToken.value === ")") {
        break;
      } else if (nextToken.type !== "string" || nextToken.value !== ",") {
        throw new Error(`Expected ',' or ')', got: ${JSON.stringify(nextToken)}`);
      }
    }

    return args;
  }

  parseFunctionReturnType() {
    const arrowToken = this.tokenizer.next();
    if (arrowToken.type !== "string" || arrowToken.value !== "->") {
      throw new Error(`Expected '->', got: ${JSON.stringify(arrowToken)}`);
    }
    return this.parseType();
  }

  parseType() {
      // 이 예제에서는 간단한 텐서 타입만 처리합니다.
      // 더 많은 타입 처리를 추가하려면 이 메서드를 확장하세요.
      let typeToken = this.tokenizer.next();

      if (typeToken.type === "keyword" && typeToken.value === "tensor") {
          return this.parseTensorType();
      } else {
          throw new Error(`Unexpected type: ${JSON.stringify(typeToken)}`);
      }
  }

  parseTensorType() {
      const openAngleToken = this.tokenizer.next();
      if (openAngleToken.type !== "string" || openAngleToken.value !== "<") {
          throw new Error(`Expected '<', got: ${JSON.stringify(openAngleToken)}`);
      }

      const dimensions = [];
      let token;

      while ((token = this.tokenizer.next())) {
          if (token.type === "string" && token.value === "x") {
              continue;
          } else if (token.type === "string" && token.value === ">") {
              break;
          } else if (token.type === "keyword" && /^\d+$/.test(token.value)) {
              dimensions.push(parseInt(token.value, 10));
          } else {
              throw new Error(`Unexpected token in tensor type: ${JSON.stringify(token)}`);
          }
      }

      const elementType = this.parseElementType();

      return {
          type: "tensor",
          dimensions,
          elementType
      };
  }

  parseElementType() {
      // 이 예제에서는 간단한 f32 타입만 처리합니다.
      // 더 많은 요소 타입 처리를 추가하려면 이 메서드를 확장하세요.
      const elementTypeToken = this.tokenizer.next();

      if (elementTypeToken.type === "keyword" && elementTypeToken.value === "f32") {
          return "f32";
      } else {
          throw new Error(`Unexpected element type: ${JSON.stringify(elementTypeToken)}`);
      }
  }
}

// const input = `func @add(%arg0: i32, %arg1: i32) -> i32 {
//     %0 = addi %arg0, %arg1 : i32
//     return %0 : i32
//   }`;

// 사용 예시
const input = `
module {
stablehlo.func @main(%image: tensor<28x28xf32>, %weights: tensor<784x10xf32>,%bias: tensor<1x10xf32>) -> tensor<1x10xf32> {
  %0 = "stablehlo.reshape"(%image) : (tensor<28x28xf32>) -> tensor<1x784xf32>
  %1 = "stablehlo.dot"(%0, %weights) : (tensor<1x784xf32>, tensor<784x10xf32>) -> tensor<1x10xf32>
  %2 = "stablehlo.add"(%1, %bias) : (tensor<1x10xf32>, tensor<1x10xf32>) -> tensor<1x10xf32>
  %3 = "stablehlo.constant"() { value = dense<0.0> : tensor<1x10xf32> } : () -> tensor<1x10xf32>
  %4 = "stablehlo.maximum"(%2, %3) : (tensor<1x10xf32>, tensor<1x10xf32>) -> tensor<1x10xf32>
  "stablehlo.return"(%4): (tensor<1x10xf32>) -> ()
}
}
`;

// const parser = new MLIRParser(input);
// const parsed = parser.parse();
// console.log(parsed);

const tokenizer = new MLIRTokenizer(input)
console.log(tokenizer.next())

  