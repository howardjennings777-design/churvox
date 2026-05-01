import React from 'react'; export default function Button({children,secondary,...props}){return <button className={`btn ${secondary?'secondary':''}`} {...props}>{children}</button>}
