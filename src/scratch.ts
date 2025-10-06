/* v8 ignore next 10 -- @preserve */

export {};

const array1 = [1, 2, 3];

// Should pass linting
console.log(array1.at(0));

// Should fail linting
console.log(array1[0]);

// Should fail linting
const fileList = new FileList();
console.log(fileList[0]);

// Should pass linting
console.log(fileList.item(0));
