async function s(t,c){const o=t==null?void 0:t.context;if(o&&typeof o.json=="function")try{const n=await o.clone().json();if(n!=null&&n.error)return n.error}catch{}return c}export{s as f};
