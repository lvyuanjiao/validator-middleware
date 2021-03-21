import validate from './validate';
import Field from './field';

export default validate;
export const field = (fieldName, optional) => new Field(fieldName, optional);
export const body = (fieldName, optional) => new Field(`body.${fieldName}`, optional);
export const query = (fieldName, optional) => new Field(`query.${fieldName}`, optional);
export const param = (fieldName, optional) => new Field(`params.${fieldName}`, optional);
export const header = (fieldName, optional) => new Field(`headers.${fieldName}`, optional);
export const cookie = (fieldName, optional) => new Field(`cookies.${fieldName}`, optional);
