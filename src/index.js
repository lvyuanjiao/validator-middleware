import validate from './validate';
import Field from './field';

export default validate;
export const field = fieldName => new Field(fieldName);
export const body = fieldName => new Field(`body.${fieldName}`);
export const query = fieldName => new Field(`query.${fieldName}`);
export const param = fieldName => new Field(`params.${fieldName}`);
export const header = fieldName => new Field(`headers.${fieldName}`);
export const cookie = fieldName => new Field(`cookies.${fieldName}`);
