import React from "react";
import { SvgXml } from "react-native-svg";
import { SkylineRenderer } from "./trackingScenery";

export const delhiSkyline: SkylineRenderer = (_W, _H) => (
  <SvgXml xml={`<g><rect x="0" y="175" width="340" height="75" fill="#8B3624"/>
      <path d="M 136 175 L 136 115 Q 170 85 204 115 L 204 175 Z" fill="none" stroke="#A8442E" stroke-width="17"/>
      <circle cx="61.199999999999996" cy="150" r="8" fill="#A8442E"/><rect x="34" y="150" width="54.4" height="25" fill="#A8442E"/>
      <circle cx="278.8" cy="150" r="8" fill="#A8442E"/><rect x="251.6" y="150" width="54.4" height="25" fill="#A8442E"/>
      <rect x="0" y="175" width="340" height="2" fill="#E8D9BF" opacity=".6"/></g>`} />
);

export const jaipurSkyline: SkylineRenderer = (_W, _H) => (
  <SvgXml xml={`<g><rect x="0" y="165" width="340" height="85" fill="#C97561"/><rect x="0" y="155" width="340" height="15" fill="#D98C7A"/>
      <rect x="122.39999999999999" y="115" width="95.2" height="55" fill="#E8A693"/><path d="M 122.39999999999999 115 q 47.6 -22 95.2 0 Z" fill="#D9748C"/>
      <circle cx="170" cy="100" r="6" fill="#D9748C"/>
      <path d="M 134.79999999999998 140 q 8 -10 16 0 Z" fill="#FBE8DE"/><rect x="136.79999999999998" y="140" width="12" height="10" fill="#FBE8DE"/><path d="M 162 140 q 8 -10 16 0 Z" fill="#FBE8DE"/><rect x="164" y="140" width="12" height="10" fill="#FBE8DE"/><path d="M 189.2 140 q 8 -10 16 0 Z" fill="#FBE8DE"/><rect x="191.2" y="140" width="12" height="10" fill="#FBE8DE"/>
      <rect x="20.4" y="130" width="81.6" height="40" fill="#D9748C"/><rect x="237.99999999999997" y="125" width="81.6" height="45" fill="#D9748C"/></g>`} />
);

export const jodhpurSkyline: SkylineRenderer = (_W, _H) => (
  <SvgXml xml={`<g>
      <polygon points="68,155 102,75 142.79999999999998,85 170,45 204,80 244.79999999999998,70 272,155" fill="#8B7355"/>
      <rect x="156.4" y="50" width="27.2" height="25" fill="#6B5740"/>
      <rect x="0" y="150" width="340" height="100" fill="#3E6B8C"/>
      <rect x="20.4" y="175" width="27.2" height="40" fill="#4A78A0"/><rect x="23.4" y="185" width="3" height="4" fill="#CFE0EC" opacity=".7"/><rect x="51" y="165" width="27.2" height="40" fill="#4A78A0"/><rect x="54" y="175.00000000000003" width="3" height="4" fill="#CFE0EC" opacity=".7"/><rect x="81.6" y="180" width="27.2" height="40" fill="#4A78A0"/><rect x="84.6" y="190" width="3" height="4" fill="#CFE0EC" opacity=".7"/><rect x="112.2" y="170" width="27.2" height="40" fill="#4A78A0"/><rect x="115.2" y="180.00000000000003" width="3" height="4" fill="#CFE0EC" opacity=".7"/><rect x="210.8" y="175" width="27.2" height="40" fill="#4A78A0"/><rect x="213.8" y="185" width="3" height="4" fill="#CFE0EC" opacity=".7"/><rect x="241.39999999999998" y="165" width="27.2" height="40" fill="#4A78A0"/><rect x="244.39999999999998" y="175.00000000000003" width="3" height="4" fill="#CFE0EC" opacity=".7"/><rect x="272" y="180" width="27.2" height="40" fill="#4A78A0"/><rect x="275" y="190" width="3" height="4" fill="#CFE0EC" opacity=".7"/><rect x="302.6" y="170" width="27.2" height="40" fill="#4A78A0"/><rect x="305.6" y="180.00000000000003" width="3" height="4" fill="#CFE0EC" opacity=".7"/>
      </g>`} />
);

export const udaipurSkyline: SkylineRenderer = (_W, _H) => (
  <SvgXml xml={`<g><rect x="0" y="195" width="340" height="55" fill="#7BAFC4" opacity=".6"/>
      <rect x="95.2" y="145" width="149.6" height="50" fill="#F0EBDD"/>
      <circle cx="170" cy="130" r="10" fill="#E8E0D0"/><rect x="167.5" y="100" width="5" height="13" fill="#E8E0D0"/>
      <circle cx="122.39999999999999" cy="140" r="5" fill="#E8E0D0"/><circle cx="217.6" cy="140" r="5" fill="#E8E0D0"/>
      <ellipse cx="170" cy="200" rx="81.6" ry="4" fill="#F0EBDD" opacity=".3"/></g>`} />
);

export const amritsarSkyline: SkylineRenderer = (_W, _H) => (
  <SvgXml xml={`<g><rect x="0" y="185" width="340" height="65" fill="#5C8FB8"/>
      <rect x="115.60000000000001" y="145" width="108.8" height="45" fill="#F2EAD3"/>
      <path d="M 129.2 145 q 40.8 -22 81.6 0 Z" fill="#D9A53E"/><circle cx="170" cy="85" r="3" fill="#D9A53E"/><rect x="166.6" y="75" width="2" height="6" fill="#D9A53E"/>
      <ellipse cx="170" cy="195" rx="68" ry="5" fill="#D9A53E" opacity=".25"/></g>`} />
);

export const chandigarhSkyline: SkylineRenderer = (_W, _H) => (
  <SvgXml xml={`<g>
      <polygon points="0,125 102,90 204,115 340,95 340,150 0,150" fill="#A8B8A0" opacity=".4"/>
      <rect x="0" y="140" width="340" height="15" fill="#7BA0B8" opacity=".5"/>
      <rect x="27.2" y="100" width="47.6" height="50" fill="#B5AC9C"/>
      <rect x="142.79999999999998" y="80" width="61.199999999999996" height="70" fill="#B5AC9C"/>
      <rect x="142.79999999999998" y="125" width="61.199999999999996" height="8.75" fill="#A8543A"/>
      <rect x="265.2" y="90" width="44.2" height="60" fill="#A39B8B"/>
      <g fill="#7D7565" opacity=".5"><rect x="153" y="90" width="7.4799999999999995" height="32.5"/><rect x="166.6" y="90" width="7.4799999999999995" height="32.5"/><rect x="180.20000000000002" y="90" width="7.4799999999999995" height="32.5"/><rect x="193.79999999999998" y="90" width="7.4799999999999995" height="32.5"/></g>
      <g fill="#4A7A4A"><ellipse cx="13.6" cy="175" rx="30.599999999999998" ry="22.5"/><ellipse cx="61.199999999999996" cy="175" rx="30.599999999999998" ry="22.5"/><ellipse cx="102" cy="175" rx="30.599999999999998" ry="22.5"/><ellipse cx="210.8" cy="175" rx="30.599999999999998" ry="22.5"/><ellipse cx="244.79999999999998" cy="175" rx="30.599999999999998" ry="22.5"/><ellipse cx="292.4" cy="175" rx="30.599999999999998" ry="22.5"/><ellipse cx="326.4" cy="175" rx="30.599999999999998" ry="22.5"/></g>
      <g fill="#5C9C5C"><ellipse cx="0" cy="185" rx="28.900000000000002" ry="18.75"/><ellipse cx="40.8" cy="185" rx="28.900000000000002" ry="18.75"/><ellipse cx="81.6" cy="185" rx="28.900000000000002" ry="18.75"/><ellipse cx="122.39999999999999" cy="185" rx="28.900000000000002" ry="18.75"/><ellipse cx="190.4" cy="185" rx="28.900000000000002" ry="18.75"/><ellipse cx="231.20000000000002" cy="185" rx="28.900000000000002" ry="18.75"/><ellipse cx="272" cy="185" rx="28.900000000000002" ry="18.75"/><ellipse cx="312.8" cy="185" rx="28.900000000000002" ry="18.75"/><ellipse cx="340" cy="185" rx="28.900000000000002" ry="18.75"/></g>
      <g fill="#6FAE6F" opacity=".85"><ellipse cx="20.4" cy="195" rx="23.8" ry="13.75"/><ellipse cx="68" cy="195" rx="23.8" ry="13.75"/><ellipse cx="108.8" cy="195" rx="23.8" ry="13.75"/><ellipse cx="149.6" cy="195" rx="23.8" ry="13.75"/><ellipse cx="197.2" cy="195" rx="23.8" ry="13.75"/><ellipse cx="237.99999999999997" cy="195" rx="23.8" ry="13.75"/><ellipse cx="285.59999999999997" cy="195" rx="23.8" ry="13.75"/></g>
      <rect x="0" y="210" width="340" height="40" fill="#5C8F5C"/>
      <g fill="#C7491F" opacity=".6"><circle cx="51" cy="205" r="2"/><circle cx="170" cy="205" r="2"/><circle cx="221" cy="205" r="2"/><circle cx="299.2" cy="205" r="2"/></g>
      <rect x="91.80000000000001" y="140" width="2.5" height="40" fill="#8C8474"/>
      <path d="M 91.80000000000001 140 q -4 -6 -2 -10 m 2 10 q 4 -6 2 -10 m -2 4 q -2 -8 1 -12 m -1 12 q 2 -8 -1 -12" stroke="#8C8474" stroke-width="1.6" fill="none" stroke-linecap="round"/></g>`} />
);

export const mumbaiSkyline: SkylineRenderer = (_W, _H) => (
  <SvgXml xml={`<g><rect x="0" y="215" width="340" height="35" fill="#3E5C6B" opacity=".6"/>
      
      <rect x="6.8" y="125" width="34" height="90" rx="6" fill="#E8D9C4"/><rect x="6.8" y="115" width="34" height="12.5" rx="6" fill="#C9A876"/>
      <rect x="44.2" y="100" width="37.4" height="115" rx="7" fill="#F0DCC8"/><rect x="44.2" y="90" width="37.4" height="12.5" rx="7" fill="#D9B98F"/>
      <rect x="85" y="120" width="34" height="95" rx="6" fill="#E8C8B8"/>
      
      <rect x="129.2" y="110" width="68" height="105" fill="none" stroke="#C9A876" stroke-width="12.92"/>
      <rect x="129.2" y="100" width="68" height="15" fill="#C9A876"/>
      <rect x="122.39999999999999" y="105" width="10.2" height="45" fill="#C9A876"/><rect x="207.4" y="105" width="10.2" height="45" fill="#C9A876"/>
      <rect x="204" y="115" width="34" height="100" rx="6" fill="#F0DCC8"/><rect x="204" y="105" width="34" height="12.5" rx="6" fill="#D9B98F"/>
      <rect x="241.39999999999998" y="90" width="37.4" height="125" rx="7" fill="#E8D9C4"/><rect x="241.39999999999998" y="80" width="37.4" height="12.5" rx="7" fill="#C9A876"/>
      <rect x="282.2" y="115" width="37.4" height="100" rx="6" fill="#F0DCC8"/>
      
      <g fill="#FFCB6B"><rect x="194.8064898179844" y="155.34615030977875" width="2.4" height="3" opacity="0.8836096070706845"/><rect x="215.10732945776545" y="130.73325088713318" width="2.4" height="3" opacity="0.7369666439830325"/><rect x="97.82084072288126" y="171.22701885411516" width="2.4" height="3" opacity="0.889463591738604"/><rect x="156.7113848987501" y="137.49313608044758" width="2.4" height="3" opacity="0.8969264750718139"/><rect x="237.589171721926" y="142.63013620860875" width="2.4" height="3" opacity="0.5887642270768992"/><rect x="165.11578247444703" y="176.79508161265403" width="2.4" height="3" opacity="0.7747794042923488"/><rect x="18.13674519057386" y="157.37037313636392" width="2.4" height="3" opacity="0.8768018416594714"/><rect x="32.147700970806184" y="168.30915914848447" width="2.4" height="3" opacity="0.5141920800320804"/><rect x="95.96558091077023" y="120.56032531894743" width="2.4" height="3" opacity="0.5835600532242097"/><rect x="248.77328931731174" y="162.73020456777883" width="2.4" height="3" opacity="0.5122056241962127"/><rect x="68.17494835034013" y="190.84193127928302" width="2.4" height="3" opacity="0.7194829628104344"/><rect x="256.3089985988569" y="143.7515571108088" width="2.4" height="3" opacity="0.7024530778755433"/><rect x="28.074519382882862" y="119.62534610647708" width="2.4" height="3" opacity="0.750469900679309"/><rect x="193.51258988389748" y="137.0657206256874" width="2.4" height="3" opacity="0.7905624820734374"/><rect x="78.97320254812949" y="142.3266670992598" width="2.4" height="3" opacity="0.8323796177282929"/><rect x="271.00668992125435" y="160.71966603631154" width="2.4" height="3" opacity="0.5918855440919287"/><rect x="101.06842548325658" y="141.36924733174965" width="2.4" height="3" opacity="0.5336125833913684"/><rect x="212.18652691538446" y="176.26920389942825" width="2.4" height="3" opacity="0.8118896524654702"/><rect x="291.4550425285474" y="122.91712230304256" width="2.4" height="3" opacity="0.9246808610507287"/><rect x="144.5304716336541" y="199.80650957440957" width="2.4" height="3" opacity="0.56178428347921"/><rect x="49.81698838677258" y="116.42586147412658" width="2.4" height="3" opacity="0.6622005586628802"/><rect x="159.49352071718312" y="170.07298172451553" width="2.4" height="3" opacity="0.9048010879661887"/><rect x="39.948875590460375" y="179.76382135646418" width="2.4" height="3" opacity="0.9206904793973081"/><rect x="99.30678532780148" y="178.59268552158025" width="2.4" height="3" opacity="0.5808302235789597"/></g>
      
      <path d="M 0 220 Q 170 235 340 220" fill="none" stroke="#FFD98A" stroke-width="1.4" stroke-dasharray="2 4" opacity=".8"/>
      <ellipse cx="20.4" cy="215" rx="3" ry="6" fill="#3E8F5C"/><rect x="19.720000000000002" y="215" width="1.5" height="25" fill="#6B4A34"/></g>`} />
);

export const puneSkyline: SkylineRenderer = (_W, _H) => (
  <SvgXml xml={`<g><rect x="0" y="175" width="340" height="75" fill="#A8754C"/>
      <rect x="122.39999999999999" y="115" width="95.2" height="75" fill="#8B5A3C"/>
      <path d="M 149.6 190 L 149.6 145 Q 170 125 190.4 145 L 190.4 190 Z" fill="#6B4128"/>
      <circle cx="132.6" cy="125" r="3" fill="#D9C09A"/><circle cx="204" cy="125" r="3" fill="#D9C09A"/>
      <rect x="34" y="145" width="68" height="30" fill="#9C6B45"/><rect x="237.99999999999997" y="145" width="68" height="30" fill="#9C6B45"/></g>`} />
);

export const hyderabadSkyline: SkylineRenderer = (_W, _H) => (
  <SvgXml xml={`<g><rect x="0" y="205" width="340" height="45" fill="#C9B896"/>
      
      <g><rect x="34" y="190" width="20.4" height="12.5" fill="#C7491F"/><rect x="61.199999999999996" y="190" width="20.4" height="12.5" fill="#3E8F7C"/><rect x="88.4" y="190" width="20.4" height="12.5" fill="#D9A53E"/><rect x="237.99999999999997" y="190" width="20.4" height="12.5" fill="#C7491F"/><rect x="265.2" y="190" width="20.4" height="12.5" fill="#3E8F7C"/><rect x="292.4" y="190" width="20.4" height="12.5" fill="#D9A53E"/></g>
      
      <rect x="102" y="115" width="136" height="90" fill="#9DA68F"/>
      <path d="M 142.79999999999998 205 L 142.79999999999998 145 Q 170 110 197.2 145 L 197.2 205 Z" fill="#7D8870"/>
      
      <circle cx="170" cy="125" r="4" fill="#E8DEC4"/>
      
      
        <path d="M 101.4 115 L 102.9 55 L 107.9 55 L 109.4 115 Z" fill="#9DA68F"/>
        <path d="M 102.4 55 Q 105.4 32.5 108.4 55 Q 105.4 45 102.4 55 Z" fill="#7D8870"/>
        <rect x="104.60000000000001" y="20" width="1.6" height="15" fill="#7D8870"/>
        <circle cx="105.4" cy="85" r="2" fill="#7D8870"/>
        <path d="M 142.2 115 L 143.7 55 L 148.7 55 L 150.2 115 Z" fill="#9DA68F"/>
        <path d="M 143.2 55 Q 146.2 32.5 149.2 55 Q 146.2 45 143.2 55 Z" fill="#7D8870"/>
        <rect x="145.39999999999998" y="20" width="1.6" height="15" fill="#7D8870"/>
        <circle cx="146.2" cy="85" r="2" fill="#7D8870"/>
        <path d="M 189.79999999999998 115 L 191.29999999999998 55 L 196.29999999999998 55 L 197.79999999999998 115 Z" fill="#9DA68F"/>
        <path d="M 190.79999999999998 55 Q 193.79999999999998 32.5 196.79999999999998 55 Q 193.79999999999998 45 190.79999999999998 55 Z" fill="#7D8870"/>
        <rect x="192.99999999999997" y="20" width="1.6" height="15" fill="#7D8870"/>
        <circle cx="193.79999999999998" cy="85" r="2" fill="#7D8870"/>
        <path d="M 230.6 115 L 232.1 55 L 237.1 55 L 238.6 115 Z" fill="#9DA68F"/>
        <path d="M 231.6 55 Q 234.6 32.5 237.6 55 Q 234.6 45 231.6 55 Z" fill="#7D8870"/>
        <rect x="233.79999999999998" y="20" width="1.6" height="15" fill="#7D8870"/>
        <circle cx="234.6" cy="85" r="2" fill="#7D8870"/></g>`} />
);

export const bengaluruSkyline: SkylineRenderer = (_W, _H) => (
  <SvgXml xml={`<g><rect x="0" y="190" width="340" height="60" fill="#8B4A42"/>
      <rect x="74.8" y="155" width="190.4" height="35" fill="#7A3B36"/>
      <circle cx="170" cy="135" r="14" fill="#8B4A42"/><circle cx="170" cy="105" r="3" fill="#D9A53E"/>
      <circle cx="102" cy="145" r="6" fill="#8B4A42"/><circle cx="237.99999999999997" cy="145" r="6" fill="#8B4A42"/>
      <g fill="#5C8F5C" opacity=".7"><ellipse cx="34" cy="180" rx="9" ry="7"/><ellipse cx="306" cy="180" rx="9" ry="7"/></g></g>`} />
);

export const chennaiSkyline: SkylineRenderer = (_W, _H) => (
  <SvgXml xml={`<g><rect x="0" y="200" width="340" height="50" fill="#9FC4C8" opacity=".5"/>
      <rect x="61.199999999999996" y="125" width="27.2" height="80" fill="#C2603F"/>
      <rect x="61.199999999999996" y="125" width="27.2" height="8.75" fill="#C2603F"/><rect x="61.199999999999996" y="142.50000000000003" width="27.2" height="8.75" fill="#fff"/><rect x="61.199999999999996" y="160" width="27.2" height="8.75" fill="#C2603F"/><rect x="61.199999999999996" y="177.5" width="27.2" height="8.75" fill="#fff"/>
      <circle cx="74.8" cy="117.5" r="6" fill="#FFD98A"/>
      <rect x="170" y="155" width="68" height="25" fill="#C2603F"/><rect x="180.20000000000002" y="130" width="47.6" height="25" fill="#D9A53E"/>
      <rect x="187.00000000000003" y="110" width="34" height="20" fill="#3E8F7C"/>
      <ellipse cx="282.2" cy="140" rx="16" ry="7" fill="#5C8F5C" opacity=".7"/><rect x="278.8" y="150" width="2" height="50" fill="#6B4A34"/></g>`} />
);

export const maduraiSkyline: SkylineRenderer = (_W, _H) => (
  <SvgXml xml={`<g><rect x="0" y="210" width="340" height="40" fill="#D98B5C"/>
      
      <rect x="115.60000000000001" y="185" width="108.8" height="25" fill="#D9456E"/>
      <rect x="122.39999999999999" y="160" width="95.2" height="25" fill="#3E8F7C"/>
      <rect x="130.9" y="137.5" width="78.2" height="22.5" fill="#D9A53E"/>
      <rect x="139.4" y="117.5" width="61.199999999999996" height="20" fill="#3E6BA6"/>
      <rect x="147.9" y="100" width="44.2" height="17.5" fill="#D9456E"/>
      <rect x="156.4" y="85" width="27.2" height="15" fill="#D9A53E"/>
      <path d="M 156.4 85 Q 170 67.5 183.60000000000002 85 Z" fill="#3E8F7C"/>
      <circle cx="170" cy="65" r="2.4" fill="#D9A53E"/>
      
      <g opacity=".9"><circle cx="126.28571428571428" cy="195" r="1.5" fill="#F2D34A"/><circle cx="140.85714285714286" cy="195" r="1.5" fill="#fff"/><circle cx="155.42857142857142" cy="195" r="1.5" fill="#3E8F7C"/><circle cx="170" cy="195" r="1.5" fill="#F2D34A"/><circle cx="184.57142857142856" cy="195" r="1.5" fill="#fff"/><circle cx="199.1428571428571" cy="195" r="1.5" fill="#3E8F7C"/><circle cx="213.71428571428572" cy="195" r="1.5" fill="#F2D34A"/><circle cx="133.16666666666666" cy="170" r="1.5" fill="#F2D34A"/><circle cx="147.9" cy="170" r="1.5" fill="#fff"/><circle cx="162.63333333333333" cy="170" r="1.5" fill="#3E8F7C"/><circle cx="177.36666666666667" cy="170" r="1.5" fill="#F2D34A"/><circle cx="192.1" cy="170" r="1.5" fill="#fff"/><circle cx="206.83333333333334" cy="170" r="1.5" fill="#3E8F7C"/><circle cx="141.44000000000003" cy="147.5" r="1.5" fill="#F2D34A"/><circle cx="155.72" cy="147.5" r="1.5" fill="#fff"/><circle cx="170" cy="147.5" r="1.5" fill="#3E8F7C"/><circle cx="184.28" cy="147.5" r="1.5" fill="#F2D34A"/><circle cx="198.55999999999997" cy="147.5" r="1.5" fill="#fff"/><circle cx="149.6" cy="127.5" r="1.5" fill="#F2D34A"/><circle cx="163.2" cy="127.5" r="1.5" fill="#fff"/><circle cx="176.8" cy="127.5" r="1.5" fill="#3E8F7C"/><circle cx="190.4" cy="127.5" r="1.5" fill="#F2D34A"/><circle cx="157.53333333333333" cy="110" r="1.5" fill="#F2D34A"/><circle cx="170" cy="110" r="1.5" fill="#fff"/><circle cx="182.46666666666664" cy="110" r="1.5" fill="#3E8F7C"/></g></g>`} />
);

export const visakhapatnamSkyline: SkylineRenderer = (_W, _H) => (
  <SvgXml xml={`<g><rect x="0" y="185" width="340" height="65" fill="#3E7E8F"/>
      <path d="M 0 150 Q 68 85 136 125 Q 187.00000000000003 75 244.79999999999998 115 Q 292.4 90 340 110 L 340 185 L 0 185 Z" fill="#5C9CA8" opacity=".75"/>
      <path d="M 74.8 95 Q 170 67.5 265.2 100" stroke="#2E5C66" stroke-width="1.3" fill="none"/>
      <rect x="156.4" y="85" width="10" height="7" rx="1.5" fill="#E8D9C4" stroke="#2E5C66" stroke-width="0.8"/>
      <line x1="166.6" y1="85" x2="166.6" y2="75" stroke="#2E5C66" stroke-width="1"/>
      
      <rect x="34" y="195" width="95.2" height="25" rx="12.5" fill="#5C6068"/>
      <rect x="68" y="177.5" width="20.4" height="20" rx="2" fill="#5C6068"/>
      
      <rect x="278.8" y="130" width="3" height="75" fill="#4A4640"/>
      <path d="M 278.8 135 L 319.59999999999997 115" stroke="#4A4640" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="309.40000000000003" y1="120" x2="309.40000000000003" y2="150" stroke="#4A4640" stroke-width="1"/>
      <ellipse cx="306" cy="197.5" rx="20.4" ry="3" fill="#7A8088"/></g>`} />
);

export const kochiSkyline: SkylineRenderer = (_W, _H) => (
  <SvgXml xml={`<g><rect x="0" y="195" width="340" height="55" fill="#5C8F9C"/>
      <line x1="102" y1="195" x2="142.79999999999998" y2="105" stroke="#6B4A34" stroke-width="2.5"/>
      <line x1="197.2" y1="195" x2="142.79999999999998" y2="105" stroke="#6B4A34" stroke-width="2.5"/>
      <line x1="142.79999999999998" y1="105" x2="237.99999999999997" y2="125" stroke="#6B4A34" stroke-width="2"/>
      <path d="M 102 195 Q 153 165 197.2 195" fill="none" stroke="#3E6B5C" stroke-width="1.4" opacity=".7"/>
      <rect x="34" y="155" width="3" height="50" fill="#7A5A38"/>
      <g fill="#3E8F5C"><ellipse cx="26" cy="152" rx="8" ry="3" transform="rotate(-30 34 155)"/><ellipse cx="30" cy="151" rx="8" ry="3" transform="rotate(-15 34 155)"/><ellipse cx="34" cy="150" rx="8" ry="3" transform="rotate(0 34 155)"/><ellipse cx="38" cy="151" rx="8" ry="3" transform="rotate(15 34 155)"/><ellipse cx="42" cy="152" rx="8" ry="3" transform="rotate(30 34 155)"/></g></g>`} />
);

export const mysuruSkyline: SkylineRenderer = (_W, _H) => (
  <SvgXml xml={`<g><rect x="0" y="190" width="340" height="60" fill="#D9A53E" opacity=".3"/>
      <rect x="74.8" y="140" width="190.4" height="50" fill="#E8C49A"/>
      <circle cx="170" cy="120" r="12" fill="#D9A53E"/><rect x="168" y="90" width="4" height="10" fill="#D9A53E"/>
      <circle cx="108.8" cy="130" r="6" fill="#D9A53E"/><circle cx="231.20000000000002" cy="130" r="6" fill="#D9A53E"/>
      <g fill="#FFD98A" opacity=".8"><circle cx="95.2" cy="160" r="1.4"/><circle cx="122.39999999999999" cy="160" r="1.4"/><circle cx="149.6" cy="160" r="1.4"/><circle cx="190.4" cy="160" r="1.4"/><circle cx="217.6" cy="160" r="1.4"/><circle cx="244.79999999999998" cy="160" r="1.4"/></g></g>`} />
);

export const kolkataSkyline: SkylineRenderer = (_W, _H) => (
  <SvgXml xml={`<g><rect x="0" y="175" width="340" height="75" fill="#4A7BA6"/>
      <path d="M 34 155 L 102 105 L 170 155 M 34 155 L 170 155" fill="none" stroke="#2E4A5C" stroke-width="2"/>
      <path d="M 51 155 L 102 120 L 153 155" fill="none" stroke="#2E4A5C" stroke-width="1.4"/>
      <rect x="204" y="125" width="61.199999999999996" height="40" fill="#5C8FB8"/><rect x="204" y="125" width="61.199999999999996" height="3" fill="#F2EAD3"/>
      <path d="M 285.59999999999997 175 L 285.59999999999997 140 Q 306 110 326.4 140 L 326.4 175 Z" fill="#A8503F"/></g>`} />
);

export const varanasiSkyline: SkylineRenderer = (_W, _H) => (
  <SvgXml xml={`<g><rect x="0" y="210" width="340" height="40" fill="#4A7B9C"/>
      <rect x="0" y="180" width="340" height="7.5" fill="#D9BD96"/><rect x="0" y="187.5" width="340" height="7.5" fill="#C9A876"/><rect x="0" y="195" width="340" height="7.5" fill="#D9BD96"/><rect x="0" y="202.49999999999997" width="340" height="7.5" fill="#C9A876"/>
      <rect x="40.8" y="125" width="20.4" height="54.99999999999999" fill="#C2603F"/><polygon points="40.8,125 51,110 61.199999999999996,125" fill="#A8442E"/><rect x="102" y="95" width="20.4" height="84.99999999999999" fill="#C2603F"/><polygon points="102,95 112.19999999999999,80 122.39999999999999,95" fill="#A8442E"/><rect x="170" y="110" width="20.4" height="69.99999999999999" fill="#C2603F"/><polygon points="170,110 180.20000000000002,95 190.4,110" fill="#A8442E"/><rect x="237.99999999999997" y="85" width="20.4" height="94.99999999999999" fill="#C2603F"/><polygon points="237.99999999999997,85 248.2,70 258.4,85" fill="#A8442E"/><rect x="292.4" y="115" width="20.4" height="64.99999999999999" fill="#C2603F"/><polygon points="292.4,115 302.6,100 312.79999999999995,115" fill="#A8442E"/>
      <g fill="#FFD98A" opacity=".7"><circle cx="68" cy="215" r="2"/><circle cx="136" cy="215" r="2"/><circle cx="204" cy="215" r="2"/><circle cx="272" cy="215" r="2"/></g></g>`} />
);

export const lucknowSkyline: SkylineRenderer = (_W, _H) => (
  <SvgXml xml={`<g><rect x="0" y="190" width="340" height="60" fill="#D9B98F"/>
      <rect x="34" y="85" width="61.199999999999996" height="105" fill="none" stroke="#C2603F" stroke-width="8.5"/>
      <path d="M 44.2 85 Q 64.6 50 85 85" fill="none" stroke="#C2603F" stroke-width="8.5"/>
      <circle cx="64.6" cy="75" r="2.5" fill="#D9A53E"/>
      <rect x="156.4" y="130" width="108.8" height="60" fill="#E8C49A"/>
      <path d="M 170 130 Q 210.8 85 251.6 130 Z" fill="#D9A53E"/><circle cx="210.8" cy="80" r="3" fill="#D9A53E"/></g>`} />
);

export const bhubaneswarSkyline: SkylineRenderer = (_W, _H) => (
  <SvgXml xml={`<g><rect x="0" y="205" width="340" height="45" fill="#D98B5C"/>
      
      <rect x="68" y="165" width="61.199999999999996" height="40" fill="#B08560"/>
      <polygon points="64.6,165 98.6,130 132.6,165" fill="#9C7456"/>
      
      <path d="M 142.79999999999998 205 Q 125.8 150 142.79999999999998 115 Q 156.4 75 170 60
               Q 183.60000000000002 75 197.2 115 Q 214.2 150 197.2 205 Z" fill="#9C7456"/>
      
      <g stroke="#7D5C40" stroke-width="1" opacity=".6">
        <path d="M 136 175 Q 170 165 204 175" fill="none"/>
        <path d="M 136 145 Q 170 135 204 145" fill="none"/>
        <path d="M 139.4 115 Q 170 107.5 200.6 115" fill="none"/>
      </g>
      
      <ellipse cx="170" cy="60" rx="17" ry="3" fill="#D9A53E"/>
      <circle cx="170" cy="45" r="3" fill="#D9A53E"/><rect x="169" y="32.5" width="2" height="12.5" fill="#D9A53E"/></g>`} />
);

export const patnaSkyline: SkylineRenderer = (_W, _H) => (
  <SvgXml xml={`<g><rect x="0" y="220" width="340" height="30" fill="#4A7B9C" opacity=".5"/>
      <ellipse cx="170" cy="195" rx="88.4" ry="50" fill="#B8714A"/>
      <ellipse cx="170" cy="195" rx="88.4" ry="50" fill="none" stroke="#9C5C3C" stroke-width="1" opacity=".4"/>
      
      <path d="M 170 150 Q 258.4 165 251.6 195 Q 244.79999999999998 225 170 230
               M 170 150 Q 81.6 165 88.4 195 Q 95.2 225 170 230"
            stroke="#9C5C3C" stroke-width="1.4" fill="none" opacity=".7"/>
      <circle cx="170" cy="150" r="3" fill="#D9A53E"/>
      <path d="M 156.4 230 Q 170 215 183.60000000000002 230 Z" fill="#7A4A2E"/></g>`} />
);

export const guwahatiSkyline: SkylineRenderer = (_W, _H) => (
  <SvgXml xml={`<g><rect x="0" y="185" width="340" height="65" fill="#5C8FA8"/>
      <polygon points="102,185 187.00000000000003,105 272,185" fill="#5C7A5C"/>
      <path d="M 170 125 Q 159.79999999999998 95 187.00000000000003 75 Q 214.2 95 204 125 Z" fill="#C2603F"/>
      <g fill="#3E6B3C" opacity=".6"><ellipse cx="20.4" cy="210" rx="6" ry="3"/><ellipse cx="34" cy="210" rx="6" ry="3"/><ellipse cx="47.6" cy="210" rx="6" ry="3"/><ellipse cx="61.199999999999996" cy="210" rx="6" ry="3"/><ellipse cx="74.8" cy="210" rx="6" ry="3"/></g></g>`} />
);

export const panajiSkyline: SkylineRenderer = (_W, _H) => (
  <SvgXml xml={`<g><rect x="0" y="195" width="340" height="55" fill="#B85C3C"/>
      <rect x="122.39999999999999" y="120" width="95.2" height="75" fill="#F2EAD3"/>
      <polygon points="122.39999999999999,120 170,85 217.6,120" fill="#D9A53E"/>
      <rect x="102" y="100" width="17" height="40" fill="#F2EAD3"/><rect x="221" y="100" width="17" height="40" fill="#F2EAD3"/>
      <circle cx="170" cy="145" r="5" fill="#D9A53E"/></g>`} />
);

export const nagpurSkyline: SkylineRenderer = (_W, _H) => (
  <SvgXml xml={`<g><rect x="0" y="215" width="340" height="35" fill="#D9A56C" opacity=".4"/>
      <ellipse cx="170" cy="210" rx="108.8" ry="12.5" fill="#C9BCA4"/>
      <ellipse cx="170" cy="200" rx="91.80000000000001" ry="11.25" fill="#D9CDB4"/>
      <rect x="88.4" y="155" width="163.2" height="40" fill="#E8E0D0"/>
      <path d="M 88.4 155 A 81.6 100 0 0 1 251.6 155 Z" fill="#F0EBDD"/>
      <g stroke="#D9CDB4" stroke-width="1" opacity=".6">
        <path d="M 108.8 150 A 61.199999999999996 75 0 0 1 170 80" fill="none"/>
        <path d="M 231.20000000000002 150 A 61.199999999999996 75 0 0 0 170 80" fill="none"/>
      </g>
      <rect x="168.5" y="60" width="3" height="25" fill="#C9BCA4"/>
      <ellipse cx="170" cy="57.5" rx="6" ry="2" fill="#C9BCA4"/></g>`} />
);

export const punjabSkyline: SkylineRenderer = (_W, _H) => (
  <SvgXml xml={`<g><rect x="0" y="175" width="340" height="75" fill="#E0B84A"/>
      <rect x="115.60000000000001" y="125" width="108.8" height="50" fill="#F2E2A8"/><circle cx="170" cy="110" r="9" fill="#D4A437"/>
      <rect x="27.2" y="145" width="68" height="30" fill="#CFE0DC"/><rect x="244.79999999999998" y="145" width="68" height="30" fill="#CFE0DC"/></g>`} />
);

export const haryanaSkyline: SkylineRenderer = (_W, _H) => (
  <SvgXml xml={`<g><rect x="0" y="180" width="340" height="70" fill="#C9A26B"/>
      <rect x="27.2" y="140" width="68" height="45" fill="#B5895A"/><rect x="183.60000000000002" y="115" width="54.4" height="70" fill="#9C7748"/>
      <rect x="258.4" y="145" width="61.199999999999996" height="40" fill="#B5895A"/></g>`} />
);

export const himachalPradeshSkyline: SkylineRenderer = (_W, _H) => (
  <SvgXml xml={`<g><polygon points="0,120 68,90 136,115 204,80 272,110 340,95 340,145 0,145" fill="#9FB0BC" opacity=".5"/>
      <polygon points="23.8,145 17.8,180 29.8,180" fill="#5C6B5E"/><polygon points="51,145 45,180 57,180" fill="#5C6B5E"/><polygon points="295.8,145 289.8,180 301.8,180" fill="#5C6B5E"/><polygon points="316.2,145 310.2,180 322.2,180" fill="#5C6B5E"/>
      <rect x="81.6" y="150" width="61.199999999999996" height="45" fill="#E8E4D8"/><polygon points="74.8,150 112.2,120 149.6,150" fill="#5C6B5E"/>
      <rect x="156.4" y="135" width="74.8" height="60" fill="#DCD6C4"/><polygon points="149.6,135 193.79999999999998,100 237.99999999999997,135" fill="#48564A"/>
      <g><rect x="112.2" y="100" width="6" height="4" fill="#C7491F" opacity=".75"/><rect x="125.8" y="100" width="6" height="4" fill="#3E7EC9" opacity=".75"/><rect x="139.4" y="100" width="6" height="4" fill="#E9A23B" opacity=".75"/><rect x="153" y="100" width="6" height="4" fill="#5C8FB8" opacity=".75"/></g></g>`} />
);

export const jammuAndKashmirSkyline: SkylineRenderer = (_W, _H) => (
  <SvgXml xml={`<g><rect x="0" y="185" width="340" height="65" fill="#8FAFA0" opacity=".55"/>
      <rect x="61.199999999999996" y="140" width="74.8" height="50" fill="#E2D8C2"/><polygon points="54.4,140 98.6,110 142.79999999999998,140" fill="#7A4F3A"/>
      <g transform="translate(265.2,105)"><circle cx="0" cy="0" r="13" fill="#C97B4A"/><circle cx="-9" cy="6" r="9" fill="#C97B4A"/><circle cx="9" cy="6" r="9" fill="#C97B4A"/><rect x="-2" y="10" width="4" height="16" fill="#6B4A34"/></g>
      <path d="M 27.2 125 q -8 4 -10 14 M 27.2 125 q 8 4 10 14" stroke="#6B8A5E" stroke-width="1.4" fill="none" opacity=".7"/></g>`} />
);

export const rajasthanSkyline: SkylineRenderer = (_W, _H) => (
  <SvgXml xml={`<g><rect x="0" y="185" width="340" height="65" fill="#D9B98F"/>
      <rect x="102" y="130" width="136" height="55" fill="#C98B5E"/>
      <circle cx="122.39999999999999" cy="120" r="4" fill="#E8C49A"/><rect x="120.39999999999999" y="110" width="4" height="6" fill="#E8C49A"/><circle cx="170" cy="120" r="4" fill="#E8C49A"/><rect x="168" y="110" width="4" height="6" fill="#E8C49A"/><circle cx="217.6" cy="120" r="4" fill="#E8C49A"/><rect x="215.6" y="110" width="4" height="6" fill="#E8C49A"/>
      <rect x="34" y="155" width="47.6" height="30" fill="#B8714A"/><rect x="258.4" y="155" width="47.6" height="30" fill="#B8714A"/></g>`} />
);

export const gujaratSkyline: SkylineRenderer = (_W, _H) => (
  <SvgXml xml={`<g><rect x="0" y="165" width="340" height="85" fill="#B8935E"/>
      <rect x="108.8" y="145" width="122.39999999999999" height="25" fill="#C9A876"/><rect x="122.39999999999999" y="120" width="95.2" height="25" fill="#D6B587"/>
      <g fill="#8A6B40" opacity=".5"><rect x="27.2" y="180" width="4" height="4" transform="rotate(45 29.2 182)"/><rect x="57.8" y="180" width="4" height="4" transform="rotate(45 59.8 182)"/><rect x="88.39999999999999" y="180" width="4" height="4" transform="rotate(45 90.39999999999999 182)"/><rect x="119" y="180" width="4" height="4" transform="rotate(45 121 182)"/><rect x="149.6" y="180" width="4" height="4" transform="rotate(45 151.6 182)"/><rect x="180.2" y="180" width="4" height="4" transform="rotate(45 182.2 182)"/><rect x="210.79999999999998" y="180" width="4" height="4" transform="rotate(45 212.79999999999998 182)"/><rect x="241.39999999999998" y="180" width="4" height="4" transform="rotate(45 243.39999999999998 182)"/><rect x="272" y="180" width="4" height="4" transform="rotate(45 274 182)"/><rect x="27.2" y="191.25" width="4" height="4" transform="rotate(45 29.2 193.25)"/><rect x="57.8" y="191.25" width="4" height="4" transform="rotate(45 59.8 193.25)"/><rect x="88.39999999999999" y="191.25" width="4" height="4" transform="rotate(45 90.39999999999999 193.25)"/><rect x="119" y="191.25" width="4" height="4" transform="rotate(45 121 193.25)"/><rect x="149.6" y="191.25" width="4" height="4" transform="rotate(45 151.6 193.25)"/><rect x="180.2" y="191.25" width="4" height="4" transform="rotate(45 182.2 193.25)"/><rect x="210.79999999999998" y="191.25" width="4" height="4" transform="rotate(45 212.79999999999998 193.25)"/><rect x="241.39999999999998" y="191.25" width="4" height="4" transform="rotate(45 243.39999999999998 193.25)"/><rect x="272" y="191.25" width="4" height="4" transform="rotate(45 274 193.25)"/><rect x="27.2" y="202.5" width="4" height="4" transform="rotate(45 29.2 204.5)"/><rect x="57.8" y="202.5" width="4" height="4" transform="rotate(45 59.8 204.5)"/><rect x="88.39999999999999" y="202.5" width="4" height="4" transform="rotate(45 90.39999999999999 204.5)"/><rect x="119" y="202.5" width="4" height="4" transform="rotate(45 121 204.5)"/><rect x="149.6" y="202.5" width="4" height="4" transform="rotate(45 151.6 204.5)"/><rect x="180.2" y="202.5" width="4" height="4" transform="rotate(45 182.2 204.5)"/><rect x="210.79999999999998" y="202.5" width="4" height="4" transform="rotate(45 212.79999999999998 204.5)"/><rect x="241.39999999999998" y="202.5" width="4" height="4" transform="rotate(45 243.39999999999998 204.5)"/><rect x="272" y="202.5" width="4" height="4" transform="rotate(45 274 204.5)"/><rect x="27.2" y="213.75" width="4" height="4" transform="rotate(45 29.2 215.75)"/><rect x="57.8" y="213.75" width="4" height="4" transform="rotate(45 59.8 215.75)"/><rect x="88.39999999999999" y="213.75" width="4" height="4" transform="rotate(45 90.39999999999999 215.75)"/><rect x="119" y="213.75" width="4" height="4" transform="rotate(45 121 215.75)"/><rect x="149.6" y="213.75" width="4" height="4" transform="rotate(45 151.6 215.75)"/><rect x="180.2" y="213.75" width="4" height="4" transform="rotate(45 182.2 215.75)"/><rect x="210.79999999999998" y="213.75" width="4" height="4" transform="rotate(45 212.79999999999998 215.75)"/><rect x="241.39999999999998" y="213.75" width="4" height="4" transform="rotate(45 243.39999999999998 215.75)"/><rect x="272" y="213.75" width="4" height="4" transform="rotate(45 274 215.75)"/></g></g>`} />
);

export const maharashtraSkyline: SkylineRenderer = (_W, _H) => (
  <SvgXml xml={`<g><rect x="0" y="175" width="340" height="75" fill="#A8754C"/>
      <rect x="34" y="130" width="88.4" height="50" fill="#8B5A3C"/><rect x="136" y="110" width="68" height="70" fill="#9C6B45"/>
      <rect x="217.6" y="130" width="81.6" height="50" fill="#8B5A3C"/></g>`} />
);

export const tamilNaduSkyline: SkylineRenderer = (_W, _H) => (
  <SvgXml xml={`<g><rect x="0" y="180" width="340" height="70" fill="#D98B5C"/>
      <rect x="129.2" y="155" width="81.6" height="25" fill="#C2603F"/><rect x="136" y="130" width="68" height="25" fill="#D9A53E"/>
      <rect x="142.79999999999998" y="110" width="54.4" height="20" fill="#3E8F7C"/>
      <g><rect x="20.4" y="195" width="6.8" height="15" fill="#fff"/><rect x="35.699999999999996" y="195" width="6.8" height="15" fill="#C2603F"/><rect x="51" y="195" width="6.8" height="15" fill="#fff"/><rect x="66.3" y="195" width="6.8" height="15" fill="#C2603F"/><rect x="81.6" y="195" width="6.8" height="15" fill="#fff"/><rect x="96.89999999999999" y="195" width="6.8" height="15" fill="#C2603F"/></g></g>`} />
);

export const westBengalSkyline: SkylineRenderer = (_W, _H) => (
  <SvgXml xml={`<g><rect x="0" y="175" width="340" height="75" fill="#4A7BA6"/>
      <rect x="34" y="135" width="88.4" height="40" fill="#5C8FB8"/><rect x="34" y="135" width="88.4" height="3" fill="#F2EAD3"/>
      <path d="M 210.8 175 L 210.8 140 Q 231.20000000000002 110 251.6 140 L 251.6 175 Z" fill="#A8503F"/></g>`} />
);

export const karnatakaSkyline: SkylineRenderer = (_W, _H) => (
  <SvgXml xml={`<g><rect x="0" y="185" width="340" height="65" fill="#C9A876"/>
      <rect x="122.39999999999999" y="140" width="95.2" height="45" fill="#9C7B4A"/><polygon points="122.39999999999999,140 170,110 217.6,140" fill="#7A5E38"/>
      <rect x="34" y="150" width="2" height="40" fill="#7A5E38"/><ellipse cx="34" cy="145" rx="4" ry="8" fill="#5C8F5C"/></g>`} />
);

export const keralaSkyline: SkylineRenderer = (_W, _H) => (
  <SvgXml xml={`<g><rect x="0" y="195" width="340" height="55" fill="#5C8F9C"/>
      <rect x="108.8" y="145" width="102" height="45" fill="#E2D8C2"/><polygon points="102,145 159.79999999999998,115 217.6,145" fill="#A8503F"/>
      <rect x="40.8" y="155" width="2.5" height="45" fill="#7A5A38"/><g fill="#3E8F5C"><ellipse cx="33.8" cy="150" rx="7" ry="2.6" transform="rotate(-30 40.8 155)"/><ellipse cx="40.8" cy="150" rx="7" ry="2.6" transform="rotate(0 40.8 155)"/><ellipse cx="47.8" cy="150" rx="7" ry="2.6" transform="rotate(30 40.8 155)"/></g></g>`} />
);

export const telanganaAndAndhraPradeshSkyline: SkylineRenderer = (_W, _H) => (
  <SvgXml xml={`<g><rect x="0" y="185" width="340" height="65" fill="#D9A56C"/>
      <polygon points="68,185 115.60000000000001,125 163.2,185" fill="#9C6B45"/>
      <rect x="190.4" y="145" width="88.4" height="40" fill="#C2603F"/><rect x="204" y="125" width="61.199999999999996" height="25" fill="#D9A56C"/></g>`} />
);

export const uttarPradeshSkyline: SkylineRenderer = (_W, _H) => (
  <SvgXml xml={`<g><rect x="0" y="200" width="340" height="50" fill="#4A7B9C" opacity=".5"/>
      <rect x="68" y="125" width="20.4" height="75.00000000000001" fill="#C2603F"/><polygon points="68,125 78.2,110 88.4,125" fill="#A8442E"/><rect x="142.79999999999998" y="100" width="20.4" height="100" fill="#C2603F"/><polygon points="142.79999999999998,100 152.99999999999997,85 163.2,100" fill="#A8442E"/><rect x="217.6" y="115" width="20.4" height="85" fill="#C2603F"/><polygon points="217.6,115 227.8,100 237.99999999999997,115" fill="#A8442E"/><rect x="278.8" y="90" width="20.4" height="110.00000000000001" fill="#C2603F"/><polygon points="278.8,90 289,75 299.2,90" fill="#A8442E"/></g></g>`} />
);

export const biharSkyline: SkylineRenderer = (_W, _H) => (
  <SvgXml xml={`<g><rect x="0" y="195" width="340" height="55" fill="#C9A26B"/>
      <ellipse cx="170" cy="170" rx="54.4" ry="35" fill="#C2603F"/><rect x="68" y="165" width="54.4" height="30" fill="#9C7748"/></g>`} />
);

export const odishaSkyline: SkylineRenderer = (_W, _H) => (
  <SvgXml xml={`<g><rect x="0" y="195" width="340" height="55" fill="#D98B5C"/>
      <path d="M 136 195 Q 125.8 140 170 100 Q 214.2 140 204 195 Z" fill="#C2603F"/></g>`} />
);

export const assamSkyline: SkylineRenderer = (_W, _H) => (
  <SvgXml xml={`<g><rect x="0" y="195" width="340" height="55" fill="#5C8FA8"/>
      <polygon points="68,195 170,125 272,195" fill="#5C7A5C"/>
      <g fill="#3E6B3C" opacity=".6"><ellipse cx="13.6" cy="215" rx="6" ry="3"/><ellipse cx="27.2" cy="215" rx="6" ry="3"/><ellipse cx="40.8" cy="215" rx="6" ry="3"/><ellipse cx="54.4" cy="215" rx="6" ry="3"/><ellipse cx="68" cy="215" rx="6" ry="3"/><ellipse cx="81.60000000000001" cy="215" rx="6" ry="3"/></g></g>`} />
);
