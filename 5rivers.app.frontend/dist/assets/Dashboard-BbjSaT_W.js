import{c as h,r as y,C as m,U,T as O,B as P,j as e}from"./index-Cba2CGbx.js";import{g as R,u as E,D,f as w,C as Y,a as c,b as d,c as L,d as _,E as B}from"./dateUtils-DEm9xBK4.js";import{S as q,a as G,b as H,c as Q,d as z}from"./select-CngIqoB3.js";import{J as K}from"./JobDetailModal-ChlOPjiZ.js";import{f as x,g as W,a as X,b as Z}from"./jobCalculations-BDLgcymA.js";import"./package-xCf6bd18.js";import"./user-BIH3ilnJ.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ee=h("Minus",[["path",{d:"M5 12h14",key:"1ays0h"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const te=h("TrendingDown",[["polyline",{points:"22 17 13.5 8.5 8.5 13.5 2 7",key:"1r2t7k"}],["polyline",{points:"16 17 22 17 22 11",key:"11uiuu"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const S=h("TrendingUp",[["polyline",{points:"22 7 13.5 15.5 8.5 10.5 2 17",key:"126l90"}],["polyline",{points:"16 7 22 7 22 13",key:"kwv8wd"}]]),se=R`
  query GetDashboardStats($year: Int, $month: Int) {
    dashboardStats(year: $year, month: $month) {
      monthlyComparison {
        current {
          totalJobs
          totalDispatchers
          totalDrivers
          totalInvoices
          totalAmount
          averageJobValue
        }
        previous {
          totalJobs
          totalDispatchers
          totalDrivers
          totalInvoices
          totalAmount
          averageJobValue
        }
        percentageChange
        jobsChange
        amountChange
      }
      overallStats {
        totalJobs
        totalDispatchers
        totalDrivers
        totalInvoices
        totalAmount
        totalCompanies
        averageJobValue
      }
      recentJobs {
        id
        jobDate
        calculatedAmount
        driverPay
        invoiceStatus
        ticketIds
        jobType {
          id
          title
          company {
            id
            name
          }
        }
        driver {
          id
          name
        }
        dispatcher {
          id
          name
        }
      }
      topCompanies {
        id
        name
        industry
        location
      }
    }
  }
`;function me(){var N;const[p,C]=y.useState(new Date().getFullYear()),[v,$]=y.useState(new Date().getMonth()+1),{data:g,loading:A,error:b}=E(se,{variables:{year:p,month:v}});b&&console.error("Dashboard error:",b);const o=g==null?void 0:g.dashboardStats,s=o==null?void 0:o.monthlyComparison,n=o==null?void 0:o.overallStats,T=(()=>{const t=[],a=new Date;for(let r=0;r<12;r++){const l=new Date(a.getFullYear(),a.getMonth()-r,1),i=l.getFullYear(),f=l.getMonth()+1,F=l.toLocaleDateString("en-US",{year:"numeric",month:"long"});t.push({value:`${i}-${f}`,label:F,year:i,month:f})}return t})(),J=t=>{const[a,r]=t.split("-").map(Number);C(a),$(r)},u=t=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:0,maximumFractionDigits:0}).format(t),M=t=>`${t>0?"+":""}${t.toFixed(1)}%`,k=t=>t>0?{icon:S,color:"text-green-600"}:t<0?{icon:te,color:"text-red-600"}:{icon:ee,color:"text-gray-600"},I=s?[{title:"Jobs This Month",value:s.current.totalJobs.toString(),change:`${s.jobsChange>0?"+":""}${s.jobsChange} vs last month`,icon:m,color:"text-blue-600",bg:"bg-blue-50",changeValue:s.jobsChange},{title:"Revenue This Month",value:u(s.current.totalAmount),change:M(s.percentageChange)+" vs last month",icon:D,color:"text-emerald-600",bg:"bg-emerald-50",changeValue:s.percentageChange},{title:"Active Dispatchers",value:s.current.totalDispatchers.toString(),change:`${s.current.totalDispatchers-s.previous.totalDispatchers>0?"+":""}${s.current.totalDispatchers-s.previous.totalDispatchers} vs last month`,icon:U,color:"text-purple-600",bg:"bg-purple-50",changeValue:s.current.totalDispatchers-s.previous.totalDispatchers},{title:"Active Drivers",value:s.current.totalDrivers.toString(),change:`${s.current.totalDrivers-s.previous.totalDrivers>0?"+":""}${s.current.totalDrivers-s.previous.totalDrivers} vs last month`,icon:O,color:"text-orange-600",bg:"bg-orange-50",changeValue:s.current.totalDrivers-s.previous.totalDrivers}]:[],V=n?[{title:"Total Jobs",value:n.totalJobs.toString(),subtitle:"All time",icon:m,color:"text-blue-600",bg:"bg-blue-50"},{title:"Total Revenue",value:u(n.totalAmount),subtitle:"All time",icon:D,color:"text-emerald-600",bg:"bg-emerald-50"},{title:"Total Companies",value:n.totalCompanies.toString(),subtitle:"Active clients",icon:P,color:"text-purple-600",bg:"bg-purple-50"},{title:"Avg Job Value",value:u(n.averageJobValue),subtitle:"All time average",icon:S,color:"text-green-600",bg:"bg-green-50"}]:[],j=((N=o==null?void 0:o.recentJobs)==null?void 0:N.slice(0,5))||[];return e.jsxs("div",{className:"space-y-6",children:[e.jsx("div",{className:"bg-gradient-hero rounded-2xl p-6 text-white shadow-xl",children:e.jsxs("div",{className:"flex flex-col sm:flex-row sm:items-center sm:justify-between",children:[e.jsxs("div",{children:[e.jsx("h1",{className:"text-3xl font-bold mb-2",children:"Dashboard"}),e.jsx("p",{className:"text-white/90 text-lg",children:"Overview of your trucking operations and business metrics"})]}),e.jsxs("div",{className:"mt-4 sm:mt-0 flex items-center gap-4",children:[e.jsxs("div",{className:"bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2",children:[e.jsx("span",{className:"text-sm font-medium",children:"Last Updated"}),e.jsx("div",{className:"text-lg font-bold",children:w(new Date)})]}),e.jsx("div",{className:"bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 min-w-[200px]",children:e.jsxs("div",{className:"flex items-center gap-2 text-white",children:[e.jsx(Y,{className:"h-4 w-4"}),e.jsxs(q,{value:`${p}-${v}`,onValueChange:J,children:[e.jsx(G,{className:"bg-transparent border-white/30 text-white",children:e.jsx(H,{placeholder:"Select month"})}),e.jsx(Q,{children:T.map(t=>e.jsx(z,{value:t.value,children:t.label},t.value))})]})]})})]})]})}),A?e.jsxs("div",{className:"space-y-6",children:[e.jsx("div",{className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6",children:[...Array(4)].map((t,a)=>e.jsx(c,{className:"bg-gradient-card shadow-card border-0",children:e.jsx(d,{className:"p-6",children:e.jsxs("div",{className:"animate-pulse",children:[e.jsx("div",{className:"h-4 bg-gray-200 rounded mb-2"}),e.jsx("div",{className:"h-8 bg-gray-200 rounded mb-1"}),e.jsx("div",{className:"h-3 bg-gray-200 rounded"})]})})},a))}),e.jsx("div",{className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6",children:[...Array(4)].map((t,a)=>e.jsx(c,{className:"bg-gradient-card shadow-card border-0",children:e.jsx(d,{className:"p-6",children:e.jsxs("div",{className:"animate-pulse",children:[e.jsx("div",{className:"h-4 bg-gray-200 rounded mb-2"}),e.jsx("div",{className:"h-8 bg-gray-200 rounded mb-1"}),e.jsx("div",{className:"h-3 bg-gray-200 rounded"})]})})},a))})]}):e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"space-y-4",children:[e.jsx("h2",{className:"text-xl font-semibold text-foreground",children:"Current Month Performance"}),e.jsx("div",{className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6",children:I.map(t=>{const a=k(t.changeValue),r=a.icon;return e.jsx(c,{className:"bg-gradient-card shadow-card border-0 hover:shadow-elevated transition-smooth",children:e.jsx(d,{className:"p-6",children:e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("div",{className:"flex-1",children:[e.jsx("p",{className:"text-sm font-medium text-muted-foreground",children:t.title}),e.jsx("p",{className:"text-2xl font-bold text-foreground",children:t.value}),e.jsxs("div",{className:"flex items-center gap-1 mt-1",children:[e.jsx(r,{className:`h-3 w-3 ${a.color}`}),e.jsx("p",{className:`text-xs font-medium ${a.color}`,children:t.change})]})]}),e.jsx("div",{className:`p-3 rounded-xl ${t.bg}`,children:e.jsx(t.icon,{className:`h-6 w-6 ${t.color}`})})]})})},t.title)})})]}),e.jsxs("div",{className:"space-y-4",children:[e.jsx("h2",{className:"text-xl font-semibold text-foreground",children:"Overall Statistics"}),e.jsx("div",{className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6",children:V.map(t=>e.jsx(c,{className:"bg-gradient-card shadow-card border-0 hover:shadow-elevated transition-smooth",children:e.jsx(d,{className:"p-6",children:e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("div",{children:[e.jsx("p",{className:"text-sm font-medium text-muted-foreground",children:t.title}),e.jsx("p",{className:"text-2xl font-bold text-foreground",children:t.value}),e.jsx("p",{className:"text-xs text-muted-foreground mt-1",children:t.subtitle})]}),e.jsx("div",{className:`p-3 rounded-xl ${t.bg}`,children:e.jsx(t.icon,{className:`h-6 w-6 ${t.color}`})})]})})},t.title))})]})]}),e.jsxs("div",{className:"space-y-4",children:[e.jsx("h2",{className:"text-xl font-semibold text-foreground",children:"Recent Jobs"}),e.jsxs(c,{className:"bg-gradient-card shadow-card border-0",children:[e.jsx(L,{children:e.jsxs(_,{className:"flex items-center gap-2",children:[e.jsx(m,{className:"h-5 w-5 text-primary"}),"Recent Jobs"]})}),e.jsx(d,{className:"space-y-4",children:j.length>0?j.map(t=>{var a,r,l,i;return e.jsx(K,{job:t,trigger:e.jsxs("div",{className:"flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group",children:[e.jsxs("div",{className:"flex-1",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-1",children:[e.jsx("span",{className:"text-sm font-medium text-foreground",children:t.id}),e.jsx("span",{className:`px-2 py-1 rounded text-xs font-medium ${t.invoiceStatus==="Paid"?"bg-green-100 text-green-800":t.invoiceStatus==="Pending"?"bg-yellow-100 text-yellow-800":"bg-blue-100 text-blue-800"}`,children:t.invoiceStatus||"Draft"})]}),e.jsx("p",{className:"text-sm text-muted-foreground",children:((r=(a=t.jobType)==null?void 0:a.company)==null?void 0:r.name)||"No Company"}),e.jsxs("p",{className:"text-sm text-muted-foreground",children:[((l=t.driver)==null?void 0:l.name)||"No Driver"," • ",w(t.jobDate)]})]}),e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsxs("div",{className:"text-right",children:[e.jsx("p",{className:"text-sm font-medium text-foreground",children:x(t.calculatedAmount)}),e.jsxs("p",{className:"text-xs text-muted-foreground",children:["Commission: ",x(W(t))," | After comm: ",x(X(t))]}),e.jsxs("p",{className:"text-xs text-muted-foreground",children:["Driver pay: ",x(Z(t))]}),e.jsx("p",{className:"text-xs text-muted-foreground",children:((i=t.jobType)==null?void 0:i.title)||"No Job Type"})]}),e.jsx(B,{className:"h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors"})]})]})},t.id)}):e.jsxs("div",{className:"text-center py-8 text-muted-foreground",children:[e.jsx(m,{className:"h-12 w-12 mx-auto mb-2 opacity-50"}),e.jsx("p",{children:"No recent jobs found"})]})})]})]})]})}export{me as Dashboard};
