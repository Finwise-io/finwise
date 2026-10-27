import json,pathlib,decimal,collections
from decimal import Decimal as D
p=pathlib.Path(__file__).parent/'audit_results'
files=sorted(p.glob('MoneyKeel_CashFlow_Audit_Part_*.json'))
def n(v):
 if isinstance(v,dict) and 'exact' in v:
  s=v['exact']
  if '/' in s:
   a,b=s.split('/');return D(a)/D(b)
  return D(s)
 if isinstance(v,(int,float)) and not isinstance(v,bool):return D(str(v))
 return None
errors=[];checks=[];allcases=[]
for f in files:
 r=json.loads(f.read_text());allcases+=r.get('cases',[])
 for c in r.get('cases',[]):
  def walk(obj,path='expected'):
   if isinstance(obj,dict):
    for rowskey,totalkey in [('rows','total'),('rows','surplus'),('take_home_rows','usual_month'),('balance_rows','total'),('planned_rows','planned_total'),('recurring_rows','recurring_total')]:
     if rowskey in obj and totalkey in obj and isinstance(obj[rowskey],list):
      vals=[n(z) for z in obj[rowskey]];target=n(obj[totalkey])
      if vals and all(v is not None for v in vals) and target is not None:
       ok=abs(sum(vals)-target)<D('.00000001');checks.append((c['case_id'],path,rowskey,totalkey,ok))
       if not ok:errors.append(checks[-1])
    if all(k in obj and n(obj[k]) is not None for k in ['inflow','outflow','surplus']):
     ok=abs(n(obj['inflow'])-n(obj['outflow'])-n(obj['surplus']))<D('.00000001');checks.append((c['case_id'],path,'inflow−outflow','surplus',ok))
     if not ok:errors.append(checks[-1])
    for k,v in obj.items():walk(v,path+'.'+k)
   elif isinstance(obj,list):
    for j,v in enumerate(obj):walk(v,path+f'[{j}]')
  walk(c['expected'])
print('Reconciliation checks',len(checks),'errors',errors)
assert not errors
assert len(allcases)==1095
assert len({c['case_id'] for c in allcases})==1095
assert all(c.get('as_of') and c.get('working') for c in allcases)
assert collections.Counter(c['kind'] for c in allcases)=={'easy':438,'complex':438,'edge':219}
# Independent fixed witnesses: verify amounts authored as literals.
assert D('173111.17')*(D('.0613')-D('.0471'))==D('2458.178614')
assert D('11311.43')*D('.0505')==D('571.227215')
assert sum(D('31.17')+j*D('7.19') for j in range(7))==D('369.18')
assert D('5111.17')+D('1111.43')-D('1431.19')==D('4791.41')
assert D('7231.17')-D('611.19')-D('1311.19')-D('911.43')==D('4397.36')
assert D('2731.17')*12+D('1831.19')==D('34605.23')
assert D('2588.83')*D('.15')+D('4722.60')*D('.20')==D('1332.8445')
# Independently derive zero-return and delayed-payoff mathematical witnesses.
assert 500*12==6000 and 10000+500*12==16000
assert 60100/100==601 and 120100/100==1201
report={'row_reconciliations_checked':len(checks),'errors':errors,'cases':len(allcases),'unique_case_ids':len({c['case_id'] for c in allcases}),'all_cases_dated_and_worked':True,'fixed_financial_witnesses_checked':9,'scope':'Independent output-level arithmetic and coverage checks,not app implementation tests.'}
(p/'MoneyKeel_CashFlow_Output_QA.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
