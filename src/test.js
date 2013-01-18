var log = new Log('test');

function testAccount(domain, number, labels) {
  'use strict';
  var account = new Account(domain, number, labels);
  return account;
}

function testGoogleApps() {
  'use strict';
  return testAccount('a/cs.unc.edu', 0);
}

function testGmail() {
  'use strict';
  return testAccount('mail', 0, ['', 'Quora', 'Extension Feedback'])
    .subscribe('conversationUpdated', function () {
      log.info.apply(log, arguments);
    });
}

function testContacts() {
  'use strict';
  var str = 'To:"Shrey, Banga" <banga@cs.unc.edu>, Shrey Banga <banga.shrey@gmail.com>, "Banga, Shrey" <sb_4getmenot@yahoo.com>, test-123asd@xyz.co.uk';

  log.dir(Email.extractContacts(str));

  str = 'To: Ankur Yadav <ydvankur@gmail.com>, Prakhya Avinash <avinashprakhya@gmail.com>, -=|Þ®ä†yµ§|-||=- - <pratyushmohan@gmail.com>, "!iAbhishek!i☞【ツ】 like.no.other" <sunnyindia@gmail.com>, "»-(¯`☆´¯)->De$i BoŸ <-(¯`☆´¯)-«" <chiru_rana22@yahoo.com>, Deepak Kumar <dd.kkumar@gmail.com>, "@nupam verma.... give ur life a direction...." <14u.anupam@gmail.com>, "####I AM WHAT .........I AM#########" <kingrick.yourdaddy@gmail.com>, ۩ KASHI YATRA-08 आपका स्वागत है <sjmayank1@yahoo.co.in>, ~ Neeshu Praveen ~ The chosen 1~ Lala is here <neeshup@gmail.com>, ~Album Updated~ Tandon in Sweden <cuteiitandon@gmail.com>, Vatsala Pant <vatsala.rebel@gmail.com>, "~VatSala~ HaZArdOuS tO hEaLtH..!!" <vatsala_rebel@yahoo.com>, Tanuj Pant <loner.lostsoul@gmail.com>, ☺ Prabhjot Singh <prabhjot.sethi@gmail.com>, "$@(!-!iN !$ B@(K" <sonusachin@yahoo.co.in>, $$$ soojay $$$ interns are approachin! <sujay.naik@rediffmail.com>, "$aMaR^ BEEN THERE...DESTROYED THAT" <samar.metal@gmail.com>, "$hIvEnDr@....... тнє ƒιηαℓ ¢συηт ∂σωη bEgIn$." <shiv_arya_aryan1@yahoo.co.in>, "$I||D|-|I¥@ At last got internship" <sindhiya.nair@gmail.com>, Swapnil Garg <swapnilgarg83@gmail.com>, 0046762335009 My new no in sweden!! <vibhuvaibhav_2001@yahoo.co.in>, 09981524340 Saransh <saranshc@gmail.com>, prashant chaudhary <101.prashant@gmail.com>, 2 Mumbai 4 Sankrant <chaks.iitr@gmail.com>, ankush mahajan <83.mahajan@gmail.com>, Ashish Mittal <a4ashi_21@yahoo.co.in>, "Aadi ......." <aaddicted2u@gmail.com>, yash aditya <aadi.yash@gmail.com>, aakshi sharma <aakshi22@gmail.com>, aashish maheshwari <aashishcse1@gmail.com>, Aayush 09944819207 <aayush.cse@gmail.com>, abhay mahajan <86.abhay@gmail.com>, abhay mahajan <mahajanabhay1@gmail.com>, Abhay Mahajan{pics addeD} <86.mahajan@gmail.com>, abhi_chopra007@yahoo.com, abhi_mmmec2003@yahoo.co.in, abhijeet.v@hed.ltindia.com, Abhijit Parashar <abhijitparashar2003@gmail.com>, abhijit shetty <abhijit.varsha@gmail.com>, abhinav sarangi <abhimir@gmail.com>, Abhinav Singh <abhinav.22@gmail.com>, abhinav singh CMS <mailsforabhinav@gmail.com>, abhinav srivastava <abhinav_nestle@yahoo.com>, abhinav srivastava <abhinav125@gmail.com>, Abhinav Sudhendra <01.abhinav@gmail.com>, Abhinav Rai <abhinav.210@gmail.com>, Abhinav Soni <abhinav.soni@gmail.com>, Abhinav Mishra <abhinav1286@gmail.com>, abhinavmisra@hcl.in, Abhineet Gupta <abhineet.gupta@gmail.com>, Abhishek Pandey <abhipandey111@gmail.com>, Abhishek Bangrania <abhishek3690@gmail.com>, Abhishek Bhakuni <Abhishek_Bhakuni@lntenc.com>, abhishek bhatt <bhatt.dude@gmail.com>, abhishek chaturvedi <streetside.roamer@gmail.com>, Abhishek Choudhury <cabhishek99@gmail.com>, abhishek gupta <abhi3010@gmail.com>, Abhishek Gupta <abhizn@gmail.com>, Abhishek Gurha <abhishekgurha@gmail.com>, Abhishek Lodh <abhishek_lodh@yahoo.co.in>, abhishek nevatia <abhishekdear@gmail.com>, Abhishek Pandey <abhishekpandey.iitr@gmail.com>, Abhishek Paswan <abhishek.paswan@gmail.com>, Abhishek Sarkar <abhishek.sarkar01@gmail.com>, Abhishek Singh <singh1abhishek05@yahoo.com>, Abhishek Sinha <sinha.ab@gmail.com>, Abhishek Sundar <abhisheksundar@gmail.com>, abhishek tiwari <abhishektiwariiitr@gmail.com>, Abhishek Srivastava <abhishek11srivastava@gmail.com>, abhishek21_iitr@yahoo.co.in, abhi k <abhishek24091987@gmail.com>, abhishek chawla <abhishek4550chawla@gmail.com>, abhishekNagar <abhisheaknagar@gmail.com>, abhisheksrivastava.0128@gmail.com, Abiraj Kalmady <Abiraj_Kalmady@lntenc.com>, Abhinav Chaturvedi <abhinav.chaturvedi@gmail.com>, Achan Chopra <achan_chopra@yahoo.com>, achaturv@amazon.com, Achint Dayal <achint.dayal@gmail.com>, ADDY_RELOADED@yahoo.co.in, adi.iitr@gmail.com, Aditi Agni <aditiagni@gmail.com>, Aditi Mishra <aditi.202@gmail.com>, aditi mishra <princely.pisces@gmail.com>, aditi rathi <aditti.30@gmail.com>, Aditi Som <aditisom@gmail.com>, aditti_30@yahoo.co.in, aditya ramgopal <adityar@gmail.com>, "Aditya Singh(adi)" <adi.unreal2004@gmail.com>, Aditya Jain <aditya28jain@gmail.com>, Bijuchandran Cartoonist <bijuTOON@gmail.com>, agarwal_shilpi@rediffmail.com, agarwalkaushal@yahoo.co.in, Saurabh Aggarwala <aggarwala.saurabh@gmail.com>, ahimanshu.iitr@gmail.com, ahmed.naushad@yahoo.co.in, Ajay Dhoble <Ajay_Dhoble@lntenc.com>, AJAY KUMAR Student <6ajaykumar@iimahd.ernet.in>, ajay patel <ajaypatel.iitr@gmail.com>, Ajay Singh <asingh@contata.com>, ajay_singh99@yahoo.com, govind kumar <ajayiitr2008@gmail.com>, Ajit Patil <Ajit_Patil@lntenc.com>, Akanksha Prakash <akanksha.prakash@gmail.com>, "Akansha India Trip (nov 9-30)" <hiakanshahere@yahoo.co.in>, Akansha Khandelwal <akansha.khandelwal@gmail.com>, akash <iitrakash@gmail.com>, Akash Deep <akash.deep@hp.com>, Akhil Sharma <akhils@contata.co.in>, "Akhilesh Pandey @TATA MOTORS" <shiv030833@gmail.com>, akhilesh singh <akhileshmail1984@gmail.com>, akhilsharma81@gmail.com, Akshat Srivastava <srivastava.akshat@gmail.com>, akshat.kumar@synopsys.com, Akshay madaan <phoenix.aki@gmail.com>, Akshay Manocha <manochaakshay@yahoo.co.in>, akshay wahal <akshaywahal@gmail.com>, Manjur Alam <alam.manjur@gmail.com>, "Ali.. 9962391331" <ali.bluelagoon@gmail.com>, All i wanna do is find a way back into LOVE <sam_sam578@yahoo.com>, alok.malviya@patni.com, Alok Mishra <alok.mishra.kr@gmail.com>, alok@gmail.com, alok23gupta <alok23gupta@yahoo.co.in>, always b 2gether-9415793994 <keerti_iet@yahoo.co.in>, Aman Agarwal <mnnit.aman@gmail.com>, aman321singh@yahoo.co.in, amathur84@gmail.com, ambrish dantrey <a4ambrish@gmail.com>, amdalal@gmail.com, Amey Mandhan <mandhanamey@gmail.com>, ameya bhave <ameyabhave09@gmail.com>, Amit Verma <amiacs@gmail.com>, amit arora <amitronics2004@gmail.com>, amit babu <paomoijta@gmail.com>, Amit Bansal <chotoobansal@yahoo.com>, AMIT BISHT <foru_bisht@yahoo.co.in>, Amit Chaudhary <amit.ary@gmail.com>, "Amit Jain(Tonk ka bhai)" <amitprash@gmail.com>, "Amit katiyar(HBTI)" <amitk.katiyar@gmail.com>, Amit Kothari <amitdotkothari@gmail.com>, amit kr singh <singh.amit06@gmail.com>, Amit Lamba <amitlamba4198@gmail.com>, Amit Kumar <coolfishamit@gmail.com>, amit.bharambe@kotak.com, Amit Kumar <amit.cse.iitr@gmail.com>, amit.dahiya99@yahoo.com, amit.kumar.ec@gmail.com, amit1_jhs@rediffmail.com, amitc@contata.co.in, "Amitesh..Off 2 Home..Germany Bye bye" <boon.showers@gmail.com>, amitk@contata.co.in, Amit Kumar <amitkumar.cps@gmail.com>, Amitosh Tiwari <amitosh.iitr@gmail.com>, amitouec@gmail.com, amitronics2004@yahoo.com, amit mittal <amittal19@gmail.com>, amit verma <amitv1980@gmail.com>, amogh kabe <amoghkabe@gmail.com>, Amogh Agnihotri <amoghagnihotri@gmail.com>, AMRAPALI TALUKDER Student <7amrapalit@iimahd.ernet.in>, amrutajoshi_14@rediffmail.com, Anamika Tyagi <anamika.tyagi@gmail.com>, Ayush Anand <anand.ayush@gmail.com>, anand kumar <anand.electr@gmail.com>, Anand Pandey <anandpand@gmail.com>, anant suri <anantsuri@gmail.com>, Anant Goel <anantthewizard@gmail.com>, "anas qaiyum>>> je suis le meilleur" <quietwaterz@gmail.com>, Aneesh chandra IITR <chandra.iitr@gmail.com>, Anic aka Rishu Singh <reshu.1986@gmail.com>, Aniket Paswan <yoursaniket@gmail.com>, Aniket Sule <anikets@hbcse.tifr.res.in>, anil wadhwani <anil.wadhwani912@gmail.com>, Anirban Roy <anirban.roy05@gmail.com>, anirbanr@contata.co.in, Anirudh Arun <anirudh.arun.89@gmail.com>, Anish Kumar <anishcrazyforu@yahoo.co.in>, Anish Sanghai <anish106@gmail.com>, anjalinauriyal@yahoo.co.uk, anjul jain <anjuldeepjain@yahoo.co.in>, anjul jain <anjuldeepjain@gmail.com>, ankit bansal <bansalankit84@gmail.com>, ankit gupta <ankit19586@gmail.com>, Ankit gupta civil sr _KP <guptaankit.iitr@gmail.com>, ankit gupta <unquit.86@gmail.com>, Ankit Kapoor <holden_vitamin_caulfield@yahoo.co.in>, Ankit Kumar <ankit.jss@gmail.com>, ankit mittal <meetankitm@gmail.com>, ankit nigam <ankit.ankit.nigam9@gmail.com>, Ankit Purohit <ankitume@gmail.com>, ankit_dhir@hotmail.com, ankit_jain3@yahoo.co.in, Ankit Gupta <ankit.iitbulls@gmail.com>, ankit.jain3@gmail.com, ankit jaiwant <ankit.jaiwant@gmail.com>, ANKIT DHIR <ankit0410@gmail.com>, Ankita Jethalia <ankita.jethalia@gmail.com>, ankitc@contata.co.in, ankitchauhan1234@gmail.com, ankitm.iitr@gmail.com, Ankur Himanshu-Visionscary!!! <ankur2720@gmail.com>, ANKUR JAIN <ank09umt@gmail.com>, Ankur Jain <ankurankitjain123@gmail.com>, Ankur Jain <ankurjain.iitr@gmail.com>, ankur negi 09867212618 in mumbai <ankur.negi.india@gmail.com>, Ankur Sehgal <ank.iitr1@gmail.com>, Ankur Sharma <askankur@gmail.com>, ankur taparia <ank4uuce@iitr.ernet.in>, Ankur Taparia <ankurtaparia@gmail.com>, Ankur Himanshu <ankurr.himanshu@gmail.com>, ankurtaparia@yahoo.com, ankush bansal <ankushhbansal@gmail.com>, Ankush Yaduvanshi <ankushyaduvanshi@yahoo.com>, Anshuman Anshu <anshu.cool@gmail.com>, anshul agrawal <anshul3030@gmail.com>, Anshul Jain <jain.anshul.59@gmail.com>, Anshul Khare <iitr.anshul@gmail.com>, "anshul mittal (mendak)" <anshul4iit@gmail.com>, Anshul Sood <anshul.me2cool@gmail.com>, anshul saxena <anshul.swarup@gmail.com>, anshul goel <anshul87@gmail.com>, Anshul Agrawal <anshulagrawal@gmail.com>, Anshuman////2400 /////cleaning up/////NO WAY <anshumandun@gmail.com>, Anu Gaur <anusept03@gmail.com>, Anupriya Jain <momsanu@gmail.com>, Anugrah Solanki <anugrah.solanki.mnnit@gmail.com>, Anuj bhansali <iitbulls@gmail.com>, anuj chunn <anuj.chunn@gmail.com>, Anuj Kamat <6585.anuj@gmail.com>, Anuja Agarwal <anujaagarwal1@gmail.com>, Anupam Dhingra <anupamdhingra@gmail.com>, Anupam Sinha <anupam.com@gmail.com>, Anupam Verma <anupamz@gmail.com>, Anupam Yadav <anupamyadav29.9@gmail.com>, Anupam Sinha <anupams@contata.co.in>, Anupriya chaudhary <anupriya_salvation@yahoo.co.in>, Anurag Abbott <anuragabbott@gmail.com>, Anurag Bajpai <anuragbajpaiiitr@gmail.com>, Anurag bhaiyya ji <anurag03iitr@gmail.com>, Anurag Gulati <anurag.gulati.88@gmail.com>, anurag kumar <anuragkin2002@gmail.com>, anurag kumar <anurag_kin2002@yahoo.co.in>, anuragm@contata.co.in, anuragnoida_007@yahoo.com, apoorv shaligram <apansumt@gmail.com>, Aparna Sharma <itsme_khushi15@yahoo.com>, Aparna Sai <aparnamvs@yahoo.com>, Aparna Sharma Rakheja <aparnasharma15@gmail.com>, apurva ag <apurva.agarwal@gmail.com>, Apurva Samudra <apurva@cmu.edu>, apurva samudra <bonjour.princess@gmail.com>, ar_nirbhaydixit@yahoo.co.in, aridhi_@hotmail.com, arif khan `medicine aint easy <kewldude.khan@gmail.com>, arjit_duke@yahoo.co.in, Arjun Chaudhary <arjunashokchoudhary@gmail.com>, ArjunRamakrishnan <ramakrishnan.arjun@gmail.com>, Arpit <arpituee@gmail.com>, Arpit Tambi <smartarpit@gmail.com>, arpit gupta <arpit.iitr@gmail.com>, Arti Agarwal <arti.agarwal@gmail.com>, aru srivastava <arusri2@gmail.com>, "Aru: getting bonkers" <arusri2@yahoo.com>, Arun Meena <arun.meena@gmail.com>, Arun Pandey <arun_best_05@yahoo.co.in>, Arun Kumar Singh <arun2005.iitr@gmail.com>, Arun Pandey <arunbes@gmail.com>, "arushi aggarwal(Accenture/Mumbai)" <ru.aka.arushi@gmail.com>, Arvind Chamoli <arvindc@contata.co.in>, arvind meena 09990264636 <arvindmee@gmail.com>, arvind_c6@yahoo.com, shivendra arya <arya.aryans@gmail.com>, Deepak Toshniwal <aryaniitr@gmail.com>, ashi kashyap <ashk3101@gmail.com>, ashima pandit <ashimapandit13@gmail.com>, "Ashish @ IITR ....Cravin 4 Life in a Metro" <sunnyash15@gmail.com>, Ashish Aggarwal <ashish13.iitr@gmail.com>, ashish goel <ashish.goel007@gmail.com>, ashish gupta <ashgptddn@gmail.com>, Ashish Gupta <ashvic2005@gmail.com>, Ashish Khanna <khanna.iitr@gmail.com>, ashish kr jain <asishkjain@gmail.com>, ashish shukla bye bye roorkee <iitr.ashish@gmail.com>, ashish singhal <iitrrinku@gmail.com>, Ashish Trivedi <ashish.mba2712@gmail.com>, ashish srivastava <ashish.srivastava18@gmail.com>, Ashish Bajpai <ashish1780@gmail.com>, ashish singh <ashish19.singh@gmail.com>, ashish86chauhan@gmail.com, Ashok Rajaraman <ashokr27@gmail.com>, Ashok Soota <ashok_soota@mindtree.com>, Ashok Tripathy <ashokt@contata.co.in>, ashok_suta@mindtree.com, Ashok Agrawal <ashok.agrawal@gmail.com>, ashoktripathi01@yahoo.co.in, ASHISH SHARMA <ashish.iitr@gmail.com>, ashu dhiman <ashu.dhiman@gmail.com>, "ashu.nitk srivastava" <ashu.nitk@gmail.com>, ashuiiitr@gmail.com, ashutosh agarwala <ashutosh.83@gmail.com>, "Ashutosh Amul @ +919997440222" <amul1ashustar@gmail.com>, ashutosh bhatt <ashucoolec@gmail.com>, Ashutosh Dhiman <ashutosh.dhiman@gmail.com>, ashutosh dubey <anhad.shemal@gmail.com>, ASHUTOSH PANIA <anshuiitr@gmail.com>, Ashutosh Verma <ashutoshv@contata.co.in>, Ashutosh Bhatt <ashutosh.iiml@gmail.com>, "ashwani jain(civil sr+ IIMB)" <ashwani.jain84@gmail.com>, Ashwani Verma <ashwani.verma.iitr@gmail.com>, ashwin99m@yahoo.co.in, Ashwini Labh <ashwinilabh@gmail.com>, "Ashwini Malaiya .... got in IOCL" <malaiyaashwini@gmail.com>, "Ashwini Rathi @ Daniel Libeskind !!!" <ashwini.rathi@gmail.com>, ashwini rathore <yash.iitroorkee@gmail.com>, Ashwini Malaiya <ashwinimalaiya@gmail.com>, asif hassan <asif.manika@gmail.com>, Astha Gupta <asthagupta87@gmail.com>, Ateesh Srivastava <ateesh.s@gmail.com>, ateesh_srivastava@yahoo.com, atul harkut <atulharkut@gmail.com>, atul ranjan <atul0umt@gmail.com>, Atul Sangar <atul.sangar@gmail.com>, atul.techstar@gmail.com, atulg@contata.co.in, atulk@contata.co.in, atul vyas <atulvyas123@gmail.com>, "atulya y. (blog finally added!)" <atulya1988@gmail.com>, Aurva Kapoor <aurvakapoor@gmail.com>, austina ferns <austina.ferns@gmail.com>, averma@nvidia.com, Avi Rajput <avi_xlnc@yahoo.co.in>, Avinash <avinashiitr@gmail.com>, Avinash Arora <avi.honey23@gmail.com>, Ayaskant Sahu <magneto.ayaskant@gmail.com>, Ayesha Kohli <twinkling_candles@yahoo.co.in>, Ayush Jain <ayush39@gmail.com>, badri <kalerubadrinath@gmail.com>, Baibhav Shukla <baibhavs@gmail.com>, "Balbir singh Chabbada(mona sardar" <chhabada.iitr@gmail.com>, "BALKI:: Im @ home!!!" <balakrishna87@gmail.com>, Shrey Banga <banga.shrey@gmail.com>, "Bbye IIT Roorkee :(" <rahul.m1984@gmail.com>, "Be Indian Buy Indian...jai hind!" <vrushali6610@yahoo.com>, ankur srivastava <best.ankur@gmail.com>, bhaggi <catchuec@gmail.com>, Bharath Reddy <moonrock189@gmail.com>, bhaskerstar@gmail.com, Bhavana Sharma <rhea.angle@gmail.com>, bhupinder singh <coolbhups@gmail.com>, bindaas sbite <bindaas.sbite@gmail.com>, bindiarathi84@gmail.com, bindiyarathi84@gmail.com, Bineet Bhasin <bineet.bhasin@gmail.com>, bineetbhasin@yahoo.co.uk, Ravinder Singh Bisht <bisht.r@gmail.com>, Siddharth Jha <bit.siddharth@gmail.com>, "Bless Me... ..." <me_debanjalee@yahoo.co.in>, Bodh Parashar <bodhprasher@gmail.com>, Satya Priya Singh <born2ruletheworld@gmail.com>, Braj Bhushan <cool.braz@gmail.com>, brijesh goel <brijesh2_goel@yahoo.com>, "btp viva god elp me!!!!...& god didnt" <codeatcs@gmail.com>, bum <anandkrishna31@gmail.com>, c_kaimlg@yahoo.com, Camille Benoit <camilleb@mac.com>, Camille Benoit <camilleb@me.com>, Carolina Gregory <carogregory@gmail.com>, Carol Aledi <carol@superuber.com>, Chaitanya Sharma <sharmachittu@gmail.com>, chandan kumar <chandanindian2002@gmail.com>, Chaos 07 IIT Roorkee <chaos07.iitr@gmail.com>, Charu Aggarwal <charu.aggarwal@gmail.com>, charus@contata.co.in, charusinghal2008@yahoo.com, Brajesh Chaudhary <chaudhary.brajesh@gmail.com>, AKASH CHAUHAN <chauhanakash123@gmail.com>, chem_idd <chem_idd@googlegroups.com>, Chetan Bhagat <chetan.bhagat@db.com>, Chetan Dubey <chetan.dubey@gmail.com>, Chetan Mehrotra <chetan.mehrotra@gmail.com>, chetan.dhiware@gmail.com, chetana <chetana@contata.co.in>, Chetan Abrol <chetanabrolmca@gmail.com>, Chhavi Dutta <chhavid@gmail.com>, Nidhi Jain <nidhimca06@gmail.com>, chilluce@iitr.ernet.in, chinamaya.chinmaya@gmail.com, chinmay@iitk.ac.in, Chinmaya Dash <chinmaya.chinmaya@gmail.com>, chinmaya1232003@gmail.com, chinmaya1232003@yahoo.com, chinmoy <chinmoyjoshi@rediffmail.com>, Chinmoy Joshi <Chinmoy.Joshi@microsoft.com>, Chirag Dureja <chirag.dureja@gmail.com>, chirag rana <ranachirag22@gmail.com>, chirayu batra <chirayu.arya@gmail.com>, "Chirayu-I m gona be Screwed/Fucked/Raped...." <arya.chirayu@gmail.com>, chirayu87@rediffmail.com, Chnadra A <chandraa@contata.co.in>, chotu.piyush@gmail.com, Chris Clennon <mrclennon@gmail.com>, coolmjrules2000@yahoo.com, coolnikhi@gmail.com, cp_umc@yahoo.co.in, Nitiraj Rathore <crazy.nattu@gmail.com>, Cyril M <cyrilward951@yahoo.co.in>, "D!k$h@ K@m@t" <kamat.diksha@gmail.com>, damini <pande.devyani@gmail.com>, "Danish. Having Fun At Home :)" <nizamdanish@gmail.com>, "Debdutta Choudhuri @ Extreme Blue.IBM" <debdutta.choudhuri@gmail.com>, Deboshree Chowdhury <debomita_2417@rediffmail.com>, debosmita.b274@gmail.com, "Deep Purple @ Home" <rnathuee@yahoo.com>, "deepak rajput(chem wale )" <deepak0507@gmail.com>, deepak sir <deepjagdish@gmail.com>, Deepali Gupta <write2deepali@gmail.com>, deepika joshi <dipikajoshi18@gmail.com>, Deepna Gupta <deepna.gupta@gmail.com>, Deepthi Pb <deepthipb11@gmail.com>, Deepti Sehgal <deeptisehgal@gmail.com>, Devpriya Misra <devpriya@gmail.com>, Devender Budhwar <dev.budhwar@gmail.com>, Devanuj <devanuj@iitb.ac.in>, "Devashish (deva)" <ricky.s8n@gmail.com>, deven2003@gmail.com, Devesh Gupta <devesh_jhs@rediffmail.com>, Devesh Gupta <deveshgupta.jhs@gmail.com>, deveshwar rana <dev.shriya@gmail.com>, Devina Daryani <devina_d1@yahoo.co.in>, Devindra Kumar <devindrak@contata.com>, devishiv2001@yahoo.com, dhalbe@contata.com, "Dharani ...in Ulm." <sabbaumt@gmail.com>, dheeraj lalchandani <dlc86uch@iitr.ernet.in>, "Dheeraj...wow again 4 day holiday" <dheerajlalchandani@gmail.com>, Dhruv Dhokalia <dhokaliadhruv@yahoo.in>, Dhruv Joshi <dhruvjoshi.iitr@gmail.com>, Dhruv Sodani <dhruvsodani@gmail.com>, digvijay singh <digvonline@gmail.com>, "digvijay♥ one third commited.............." <digvijay_ultimate@yahoo.com>, diksha_kamat123@yahoo.co.in, dinesh saini <sainidinesh21@gmail.com>, dinesh_saini59@yahoo.com, dineshs@contata.co.in, Dipank Pande <dipank@gmail.com>, dipika.lal12@yahoo.com, Dishant wid swIIT dreams <dishantsmart@gmail.com>, Divay Mor <divsiitian@gmail.com>, Divik Gupta <divik.gupta@gmail.com>, Divjot Singh <divjots@gmail.com>, Divya Agarwal <divyaagarwal0107@gmail.com>, divya mishra <divya_17234@yahoo.co.in>, divyamohanmenon@gmail.com, Divye Kapoor <divyekapoor@gmail.com>, "Diwali Mania :)" <priyaoncloudnine@yahoo.com>, DIXIE <tayaluap@gmail.com>, "Dr. Aniket Sule" <aniket.sule@gmail.com>, gaurav varshney <gauravdips@gmail.com>, "Durgendra...off 2 home!Happy Holi!!" <durgendra@gmail.com>, en.chauhan.sandeep@gmail.com, "Er. Abhishek Joshi" <abhishek.joshmachine@gmail.com>, "er. Divya Mishra" <divya.17234@gmail.com>, "Er. Rahul Sachdeva" <rage.rahul@gmail.com>, "Er. Sachindra Says Ab Aiyashi Hui Kathm" <sachindra.srivastava@gmail.com>, Aakash Saini <er.aakash.saini@gmail.com>, Ankit Srivastava <er.aankitsrivastava@gmail.com>, Rohit Pardasani <eternalrohit@gmail.com>, factotumgoldy@gmail.com, Farhan Ahmad <farhan522@gmail.com>, Farhan Siddique <farhanpit@gmail.com>, farhan_19@rediffmail.com, Farman leaving Goa on 26th <farmanimam@gmail.com>, Fatima <mysteriousgal_ivy@yahoo.co.in>, Fatima <mysteriousgal_ivy@yahoo.com>, FINALLY GOT A 9 !!! <neetu8985@hotmail.com>';
  log.dir(Email.extractContacts(str));

  str = 'Randolph, Randy\n<randolph@schsr.unc.edu>';
  log.dir(Email.extractContact(str));
}

var a1, a2;

document.addEventListener('DOMContentLoaded', function () {
  'use strict';
  testContacts();
  a1 = testGoogleApps();
  a2 = testGmail();
});
