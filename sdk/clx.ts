/**
 * Credits for lukeed, writter of "clsx"
 * https://github.com/lukeed/clsx
 */

type ClassValue =
  | ClassArray
  | ClassDictionary
  | string
  | number
  | null
  | boolean
  | undefined;
type ClassDictionary = Record<string, unknown>;
type ClassArray = ClassValue[];

function toVal(mix: ClassValue[] | ClassValue) {
  let k,
    y,
    str = "";

  if (typeof mix === "string" || typeof mix === "number") {
    str += mix;
  } else if (typeof mix === "object") {
    if (Array.isArray(mix)) {
      for (k = 0; k < mix.length; k++) {
        if (mix[k]) {
          y = toVal(mix[k]);
          if (y) {
            str && (str += " ");
            str += y;
          }
        }
      }
    } else {
      for (k in mix) {
        if (mix?.[k]) {
          str && (str += " ");
          str += k;
        }
      }
    }
  }

  return str;
}

export function clsx(...inputs: ClassValue[]) {
  const result = [];

  for (const input of inputs) {
    const val = toVal(input);
    if (val) {
      result.push(val);
    }
  }

  return result.join(" ");
}

export default clsx;
