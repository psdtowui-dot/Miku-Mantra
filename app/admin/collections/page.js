'use client';
import CrudPage from '../_crud';
export default function Page(){ return <CrudPage title="Collections" endpoint="collections" fields={[{k:'name',label:'Name'},{k:'slug',label:'Slug'}]} listRender={(i)=>(<div><div className="font-medium">{i.name}</div><div className="text-xs text-neutral-500">{i.slug}</div></div>)}/>; }
