import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useStore } from '../store/useStore';
jest.mock('../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn() }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({}), router: { push: jest.fn() },
}));
const YEAR=new Date().getFullYear();
const WORKER={status:'employed',incomeSources:['employment'],name:'Pat',birthYear:String(YEAR-55),
 baseSalary:'9000',salaryMode:'gross',salaryFreq:'monthly',taxMode:'manual',manualTaxRate:'20',
 monthlySpending:'4500',targetRetirementAge:'65',horizonAge:'92'};
const ACCOUNTS=[
 {asset_id:'chk',label:'Chase Checking',institution:'Chase',kind:'checking',tax_bucket:'CASH',balance:18000,target_return:0},
 {asset_id:'sav',label:'Ally Savings',institution:'Ally',kind:'savings',tax_bucket:'CASH',balance:22000,target_return:0.01},
 {asset_id:'van',label:'Brokerage',institution:'Vanguard',kind:'brokerage',tax_bucket:'TAXABLE',balance:300000,target_return:0.07},
];
const DEBTS=[
 {debt_id:'m',label:'Mortgage',debt_type:'MORTGAGE',remaining_balance:228000,interest_rate_apr:0.0625,minimum_monthly_payment:2400},
 {debt_id:'c',label:'Car loan',debt_type:'AUTO',remaining_balance:14000,interest_rate_apr:0.069,minimum_monthly_payment:250},
];
function readable(): string[] { const out:string[]=[];
 const walk=(n:any)=>{ if(n==null) return; if(typeof n==='string'){const t=n.trim(); if(t) out.push(t); return;}
  if(n.props?.accessibilityLabel) out.push(String(n.props.accessibilityLabel)); (n.children??[]).forEach(walk); };
 walk(screen.toJSON()); return out; }
const renderScreen=(f:string)=>{ const C=require(`../screens/${f}`).default; render(<C />); };
beforeEach(()=>{ useStore.getState().resetAll();
 useStore.setState({hideBalances:false,onboardingComplete:true,nwSeeded:true,nwSetupChoice:'self',
  onboardingProfile:WORKER,assetAccounts:ACCOUNTS,liabilities:DEBTS} as any); });
const grab=(re:RegExp)=>{ for(const s of readable()){const m=s.match(re); if(m) return m[1];} return null; };
it('cross-screen NW figures', () => {
  for (const f of ['NetWorthScreen','HomeScreen','InsightsScreen','JobSafetyScreen']) {
    try {
      renderScreen(f);
      const lines=readable();
      const cash = lines.filter(s=>/\$40,000|\$40000/.test(s)).slice(0,2);
      const debtPay = lines.filter(s=>/2,650|\$2,650/.test(s)).slice(0,2);
      const ef = lines.filter(s=>/months?\b/i.test(s) && /\d/.test(s)).slice(0,3);
      console.log(`--- ${f}: CASH ${JSON.stringify(cash)} | DEBT/MO ${JSON.stringify(debtPay)} | EF ${JSON.stringify(ef)}`);
      screen.unmount();
    } catch(e:any){ console.log(`--- ${f}: THREW ${String(e.message).slice(0,90)}`); }
  }
});
