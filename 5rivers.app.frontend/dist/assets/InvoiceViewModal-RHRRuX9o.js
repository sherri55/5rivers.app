import{c as J,r as h,j as e,h as te,P as ae,p as U,m as ie,u as K,l as H,q as ne,o as V,D as oe,a as ce,b as F,d as de,e as re,f as le,B as me}from"./index-Cba2CGbx.js";import{e as ue,C as xe}from"./select-CngIqoB3.js";import{g as T,u as he,a as E,c as S,d as B,B as pe,b as O,C as z,f as _,D as fe}from"./dateUtils-DEm9xBK4.js";import{a as be,u as je}from"./ConfirmDeleteDialog-DvnSPSB_.js";import{M as ve}from"./mail-CxHw7Ghj.js";import{U as ge}from"./user-BIH3ilnJ.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const G=J("Download",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"7 10 12 15 17 10",key:"2ggqvy"}],["line",{x1:"12",x2:"12",y1:"15",y2:"3",key:"1vk2je"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ne=J("Receipt",[["path",{d:"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z",key:"q3az6g"}],["path",{d:"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8",key:"1h4pet"}],["path",{d:"M12 17.5v-11",key:"1jc1ny"}]]);var $="Checkbox",[Ce,Ee]=te($),[De,L]=Ce($);function ke(n){const{__scopeCheckbox:m,checked:r,children:p,defaultChecked:l,disabled:i,form:g,name:j,onCheckedChange:f,required:N,value:t="on",internal_do_not_use_render:x}=n,[b,D]=ie({prop:r,defaultProp:l??!1,onChange:f,caller:$}),[s,c]=h.useState(null),[d,o]=h.useState(null),a=h.useRef(!1),u=s?!!g||!!s.closest("form"):!0,v={checked:b,disabled:i,setChecked:D,control:s,setControl:c,name:j,form:g,value:t,hasConsumerStoppedPropagationRef:a,required:N,defaultChecked:I(l)?!1:l,isFormControl:u,bubbleInput:d,setBubbleInput:o};return e.jsx(De,{scope:m,...v,children:Ie(x)?x(v):p})}var X="CheckboxTrigger",Q=h.forwardRef(({__scopeCheckbox:n,onKeyDown:m,onClick:r,...p},l)=>{const{control:i,value:g,disabled:j,checked:f,required:N,setControl:t,setChecked:x,hasConsumerStoppedPropagationRef:b,isFormControl:D,bubbleInput:s}=L(X,n),c=K(l,t),d=h.useRef(f);return h.useEffect(()=>{const o=i==null?void 0:i.form;if(o){const a=()=>x(d.current);return o.addEventListener("reset",a),()=>o.removeEventListener("reset",a)}},[i,x]),e.jsx(U.button,{type:"button",role:"checkbox","aria-checked":I(f)?"mixed":f,"aria-required":N,"data-state":se(f),"data-disabled":j?"":void 0,disabled:j,value:g,...p,ref:c,onKeyDown:H(m,o=>{o.key==="Enter"&&o.preventDefault()}),onClick:H(r,o=>{x(a=>I(a)?!0:!a),s&&D&&(b.current=o.isPropagationStopped(),b.current||o.stopPropagation())})})});Q.displayName=X;var M=h.forwardRef((n,m)=>{const{__scopeCheckbox:r,name:p,checked:l,defaultChecked:i,required:g,disabled:j,value:f,onCheckedChange:N,form:t,...x}=n;return e.jsx(ke,{__scopeCheckbox:r,checked:l,defaultChecked:i,disabled:j,required:g,onCheckedChange:N,name:p,form:t,value:f,internal_do_not_use_render:({isFormControl:b})=>e.jsxs(e.Fragment,{children:[e.jsx(Q,{...x,ref:m,__scopeCheckbox:r}),b&&e.jsx(ee,{__scopeCheckbox:r})]})})});M.displayName=$;var W="CheckboxIndicator",Z=h.forwardRef((n,m)=>{const{__scopeCheckbox:r,forceMount:p,...l}=n,i=L(W,r);return e.jsx(ae,{present:p||I(i.checked)||i.checked===!0,children:e.jsx(U.span,{"data-state":se(i.checked),"data-disabled":i.disabled?"":void 0,...l,ref:m,style:{pointerEvents:"none",...n.style}})})});Z.displayName=W;var Y="CheckboxBubbleInput",ee=h.forwardRef(({__scopeCheckbox:n,...m},r)=>{const{control:p,hasConsumerStoppedPropagationRef:l,checked:i,defaultChecked:g,required:j,disabled:f,name:N,value:t,form:x,bubbleInput:b,setBubbleInput:D}=L(Y,n),s=K(r,D),c=ue(i),d=ne(p);h.useEffect(()=>{const a=b;if(!a)return;const u=window.HTMLInputElement.prototype,C=Object.getOwnPropertyDescriptor(u,"checked").set,w=!l.current;if(c!==i&&C){const P=new Event("click",{bubbles:w});a.indeterminate=I(i),C.call(a,I(i)?!1:i),a.dispatchEvent(P)}},[b,c,i,l]);const o=h.useRef(I(i)?!1:i);return e.jsx(U.input,{type:"checkbox","aria-hidden":!0,defaultChecked:g??o.current,required:j,disabled:f,name:N,value:t,form:x,...m,tabIndex:-1,ref:s,style:{...m.style,...d,position:"absolute",pointerEvents:"none",opacity:0,margin:0,transform:"translateX(-100%)"}})});ee.displayName=Y;function Ie(n){return typeof n=="function"}function I(n){return n==="indeterminate"}function se(n){return I(n)?"indeterminate":n?"checked":"unchecked"}const we=h.forwardRef(({className:n,...m},r)=>e.jsx(M,{ref:r,className:V("peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",n),...m,children:e.jsx(Z,{className:V("flex items-center justify-center text-current"),children:e.jsx(xe,{className:"h-4 w-4"})})}));we.displayName=M.displayName;const Se=T`
  query GetInvoices($dispatcherId: ID, $status: String, $pagination: PaginationInput) {
    invoices(dispatcherId: $dispatcherId, status: $status, pagination: $pagination) {
      id
      invoiceNumber
      invoiceDate
      status
      billedTo
      billedEmail
      createdAt
      updatedAt
      dispatcher {
        id
        name
        email
      }
      jobs {
        job {
          id
          jobDate
          calculatedAmount
          jobType {
            id
            title
            company {
              id
              name
            }
          }
        }
        amount
        invoicedAt
      }
      calculations {
        subTotal
        commissionRate
        commission
        hst
        total
      }
    }
  }
`,ye=T`
  query GetInvoice($id: ID!) {
    invoice(id: $id) {
      id
      invoiceNumber
      invoiceDate
      status
      billedTo
      billedEmail
      createdAt
      updatedAt
      dispatcher {
        id
        name
        email
        commissionPercent
      }
      jobs {
        job {
          id
          jobDate
          weight
          loads
          startTime
          endTime
          calculatedAmount
          calculatedHours
          jobType {
            id
            title
            startLocation
            endLocation
            company {
              id
              name
            }
          }
          driver {
            id
            name
          }
          unit {
            id
            name
            plateNumber
          }
        }
        amount
        invoicedAt
      }
      calculations {
        subTotal
        commissionRate
        commission
        hst
        total
      }
    }
  }
`,Be=T`
  mutation CreateInvoice($input: CreateInvoiceInput!) {
    createInvoice(input: $input) {
      id
      invoiceNumber
      invoiceDate
      status
      billedTo
      billedEmail
      createdAt
      updatedAt
      dispatcher {
        id
        name
        email
      }
      calculations {
        subTotal
        commissionRate
        commission
        hst
        total
      }
    }
  }
`,Oe=T`
  mutation UpdateInvoice($input: UpdateInvoiceInput!) {
    updateInvoice(input: $input) {
      id
      invoiceNumber
      invoiceDate
      status
      billedTo
      billedEmail
      updatedAt
      calculations {
        subTotal
        commissionRate
        commission
        hst
        total
      }
    }
  }
`;T`
  mutation DeleteInvoice($id: ID!) {
    deleteInvoice(id: $id)
  }
`;const Pe=T`
  mutation DownloadInvoicePDF($invoiceId: ID!) {
    downloadInvoicePDF(invoiceId: $invoiceId) {
      success
      data
      filename
      error
    }
  }
`;function Ue({invoiceId:n,trigger:m}){var b,D;const[r,p]=h.useState(!1),{toast:l}=be(),{data:i,loading:g,error:j}=he(ye,{variables:{id:n},skip:!r||!n}),[f,{loading:N}]=je(Pe),t=i==null?void 0:i.invoice,x=async()=>{var s,c,d,o;try{const a=await f({variables:{invoiceId:n}});if((c=(s=a.data)==null?void 0:s.downloadInvoicePDF)!=null&&c.success){const u=a.data.downloadInvoicePDF.data,v=a.data.downloadInvoicePDF.filename||`${(t==null?void 0:t.invoiceNumber)||"invoice"}.pdf`,C=atob(u),w=new Array(C.length);for(let y=0;y<C.length;y++)w[y]=C.charCodeAt(y);const P=new Uint8Array(w),R=new Blob([P],{type:"application/pdf"}),A=window.URL.createObjectURL(R),k=document.createElement("a");k.href=A,k.download=v,document.body.appendChild(k),k.click(),document.body.removeChild(k),window.URL.revokeObjectURL(A),l({title:"Success",description:"Invoice PDF downloaded successfully"})}else throw new Error(((o=(d=a.data)==null?void 0:d.downloadInvoicePDF)==null?void 0:o.error)||"Failed to generate PDF")}catch(a){console.error("Error downloading PDF:",a),l({title:"Error",description:"Failed to download invoice PDF",variant:"destructive"})}};return e.jsxs(oe,{open:r,onOpenChange:p,children:[e.jsx(ce,{asChild:!0,children:m||e.jsx(F,{variant:"outline",size:"sm",children:"View Invoice"})}),e.jsxs(de,{className:"max-w-2xl max-h-[90vh] overflow-y-auto",children:[e.jsx(re,{children:e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs(le,{className:"flex items-center gap-2 text-foreground",children:[e.jsx(Ne,{className:"h-5 w-5 text-primary"}),"Invoice Details"]}),t&&e.jsxs(F,{variant:"outline",size:"sm",onClick:x,disabled:N,children:[e.jsx(G,{className:"h-4 w-4 mr-2"}),"Download PDF"]})]})}),!n&&e.jsx("div",{className:"flex items-center justify-center p-8",children:e.jsx("div",{className:"text-muted-foreground",children:"No invoice associated with this job"})}),g&&n&&e.jsx("div",{className:"flex items-center justify-center p-8",children:e.jsx("div",{className:"text-muted-foreground",children:"Loading invoice details..."})}),j&&e.jsx("div",{className:"flex items-center justify-center p-8",children:e.jsxs("div",{className:"text-destructive",children:["Error loading invoice: ",j.message]})}),t&&e.jsxs("div",{className:"space-y-6",children:[e.jsxs(E,{children:[e.jsx(S,{children:e.jsxs(B,{className:"flex items-center justify-between",children:[e.jsxs("span",{children:["Invoice #",t.invoiceNumber]}),e.jsx(pe,{variant:t.status==="PAID"?"default":"secondary",children:t.status})]})}),e.jsx(O,{children:e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(z,{className:"h-4 w-4 text-muted-foreground"}),e.jsxs("span",{className:"text-sm",children:[e.jsx("span",{className:"font-medium",children:"Date:"})," ",_(t.invoiceDate)]})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(fe,{className:"h-4 w-4 text-muted-foreground"}),e.jsxs("span",{className:"text-sm",children:[e.jsx("span",{className:"font-medium",children:"Amount:"})," $",((b=t.totalAmount)==null?void 0:b.toFixed(2))||"N/A"]})]}),t.dueDate&&e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(z,{className:"h-4 w-4 text-muted-foreground"}),e.jsxs("span",{className:"text-sm",children:[e.jsx("span",{className:"font-medium",children:"Due:"})," ",_(t.dueDate)]})]})]})})]}),e.jsxs(E,{children:[e.jsx(S,{children:e.jsx(B,{children:"Billing Information"})}),e.jsx(O,{children:e.jsxs("div",{className:"space-y-3",children:[t.billedTo&&e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(me,{className:"h-4 w-4 text-muted-foreground"}),e.jsxs("span",{className:"text-sm",children:[e.jsx("span",{className:"font-medium",children:"Billed To:"})," ",t.billedTo]})]}),t.billedEmail&&e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(ve,{className:"h-4 w-4 text-muted-foreground"}),e.jsxs("span",{className:"text-sm",children:[e.jsx("span",{className:"font-medium",children:"Email:"})," ",t.billedEmail]})]}),t.dispatcher&&e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(ge,{className:"h-4 w-4 text-muted-foreground"}),e.jsxs("span",{className:"text-sm",children:[e.jsx("span",{className:"font-medium",children:"Dispatcher:"})," ",t.dispatcher.name]})]})]})})]}),t.jobs&&t.jobs.length>0&&e.jsxs(E,{children:[e.jsx(S,{children:e.jsxs(B,{children:["Jobs Included (",t.jobs.length,")"]})}),e.jsxs(O,{children:[e.jsx("div",{className:"space-y-3",children:[...t.jobs].sort((s,c)=>{var a,u;const d=new Date(((a=s.job)==null?void 0:a.jobDate)||"1970-01-01"),o=new Date(((u=c.job)==null?void 0:u.jobDate)||"1970-01-01");return d.getTime()-o.getTime()}).map((s,c)=>{var d,o,a,u,v,C,w,P,R,A,k,y,q;return e.jsxs("div",{className:"p-3 border rounded-lg bg-muted/20",children:[e.jsxs("div",{className:"flex justify-between items-start mb-2",children:[e.jsxs("div",{className:"flex-1",children:[e.jsx("div",{className:"font-medium text-foreground",children:((o=(d=s.job)==null?void 0:d.jobType)==null?void 0:o.title)||"Unknown Job"}),e.jsxs("div",{className:"text-sm text-muted-foreground",children:["Job Date: ",(a=s.job)!=null&&a.jobDate?_(s.job.jobDate):"No date"]}),((v=(u=s.job)==null?void 0:u.jobType)==null?void 0:v.company)&&e.jsxs("div",{className:"text-sm text-muted-foreground",children:["Company: ",s.job.jobType.company.name]})]}),e.jsxs("div",{className:"text-right",children:[e.jsxs("div",{className:"text-lg font-semibold text-primary bg-primary/10 px-3 py-1 rounded",children:["$",(((C=s.job)==null?void 0:C.calculatedAmount)||s.amount||0).toFixed(2)]}),((w=t.dispatcher)==null?void 0:w.commissionPercent)&&e.jsxs("div",{className:"text-xs text-muted-foreground mt-1",children:["After comm: $",((((P=s.job)==null?void 0:P.calculatedAmount)||s.amount||0)-(((R=s.job)==null?void 0:R.calculatedAmount)||s.amount||0)*(t.dispatcher.commissionPercent/100)).toFixed(2)]}),s.invoicedAt&&e.jsxs("div",{className:"text-xs text-muted-foreground mt-1",children:["Invoiced: ",_(s.invoicedAt)]})]})]}),e.jsxs("div",{className:"grid grid-cols-2 gap-4 text-sm text-muted-foreground",children:[((A=s.job)==null?void 0:A.driver)&&e.jsxs("div",{children:[e.jsx("span",{className:"font-medium",children:"Driver:"})," ",s.job.driver.name]}),((k=s.job)==null?void 0:k.unit)&&e.jsxs("div",{children:[e.jsx("span",{className:"font-medium",children:"Unit:"})," ",s.job.unit.name]}),((y=s.job)==null?void 0:y.startTime)&&((q=s.job)==null?void 0:q.endTime)&&e.jsxs("div",{className:"col-span-2",children:[e.jsx("span",{className:"font-medium",children:"Time:"})," ",s.job.startTime," - ",s.job.endTime]})]})]},c)})}),e.jsxs("div",{className:"mt-4 pt-4 border-t space-y-2",children:[e.jsxs("div",{className:"flex justify-between items-center text-sm",children:[e.jsx("span",{className:"font-medium",children:"Total (before commission):"}),e.jsxs("span",{className:"font-semibold text-lg text-primary",children:["$",t.jobs.reduce((s,c)=>{var d;return s+(((d=c.job)==null?void 0:d.calculatedAmount)||c.amount||0)},0).toFixed(2)]})]}),((D=t.dispatcher)==null?void 0:D.commissionPercent)&&e.jsxs("div",{className:"flex justify-between items-center text-sm",children:[e.jsxs("span",{className:"font-medium",children:["Total (after ",t.dispatcher.commissionPercent,"% commission):"]}),e.jsxs("span",{className:"font-semibold text-lg text-accent",children:["$",t.jobs.reduce((s,c)=>{var a;const d=((a=c.job)==null?void 0:a.calculatedAmount)||c.amount||0,o=d*(t.dispatcher.commissionPercent/100);return s+(d-o)},0).toFixed(2)]})]}),e.jsxs("div",{className:"flex justify-between items-center text-sm",children:[e.jsx("span",{className:"font-medium",children:"Driver Pay (est.):"}),e.jsxs("span",{className:"font-semibold text-lg text-muted-foreground",children:["$",t.jobs.reduce((s,c)=>{var a,u,v;const d=((a=c.job)==null?void 0:a.calculatedAmount)||c.amount||0,o=((v=(u=c.job)==null?void 0:u.driver)==null?void 0:v.hourlyRate)||0;return s+d*(o/100)},0).toFixed(2)]})]})]})]})]}),e.jsxs("div",{className:"flex justify-end gap-2",children:[e.jsx(F,{variant:"outline",size:"sm",onClick:()=>p(!1),children:"Close"}),e.jsxs(F,{size:"sm",onClick:x,children:[e.jsx(G,{className:"w-4 h-4 mr-2"}),"Download PDF"]})]})]})]})]})}export{we as C,G as D,ye as G,Ue as I,Ne as R,Oe as U,Be as a,Se as b,Pe as c};
