export type OrderError =
  | { kind: 'INVALID_ORDER_ID';                message: string }
  | { kind: 'INVALID_CUSTOMER_ID';             message: string }
  | { kind: 'INVALID_PRODUCT_ID';              message: string }
  | { kind: 'INVALID_CURRENCY';                message: string }
  | { kind: 'INVALID_AMOUNT';                  message: string }
  | { kind: 'INVALID_QUANTITY';                message: string }
  | { kind: 'CURRENCY_MISMATCH';               message: string }
  | { kind: 'ITEM_ALREADY_EXISTS';             message: string }
  | { kind: 'ORDER_IS_EMPTY';                  message: string }
  | { kind: 'ORDER_ALREADY_CONFIRMED';         message: string }
  | { kind: 'ORDER_ALREADY_CANCELLED';         message: string }
  | { kind: 'CANNOT_MODIFY_CONFIRMED_ORDER';   message: string }
  | { kind: 'CANNOT_MODIFY_CANCELLED_ORDER';   message: string };
