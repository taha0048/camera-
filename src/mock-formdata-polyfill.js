/* Dummy polyfill to prevent fetch overwrite crash */
console.log('Mocked formdata-polyfill loaded');
export const FormData = window.FormData;
export const formDataToBlob = () => { throw new Error('formDataToBlob not implemented in mock'); };
export default FormData;
