indexControllers.controller('resultCtrl',['$scope', '$routeParams', 'resultStorage', 
	'$http', 'util', 'localStorageService', '$modal', '$timeout', '$location','getSearch',
	function($scope, $routeParam, resultStorage, $http, util, local,$modal,
		$timeout,$location,getSearch){

	var shareID;
	getSearch($routeParam.shareID,function(search){
		$scope.entries = search.result.topMeta;
		$scope.shareURL = baseURL+$routeParam.shareID;
		shareID = $routeParam.shareID;
		$scope.input = search.input;
		if('uniqInput' in search.result){
			$scope.uniqInput = search.result.uniqInput;
		}
		initialization();
	});

	function initialization(){
		if($scope.input.config.searchMethod=="geneSet"){
			var effectiveInput,
			getOverlapSize = function(entry){
				var size = 0;
				for(var key in entry.overlap){
					size+=entry.overlap[key].length
				};
				return size;
			};
			$scope.allHaveSets = true;
		}
		var effectiveInput;// Gene-set method only
		$scope.entries.forEach(function(entry,i){
			entry.rank = i+1;
			// 'DEGcount' in entry for backward compactbility
			if($scope.input.config.searchMethod=="geneSet"){
				if(!('sets' in entry)&&'DEGcount' in entry){
					var overlapSize = getOverlapSize(entry);
					if(!effectiveInput) effectiveInput = Math.round(overlapSize/entry.score);
					entry.sets = [{sets:['A'],size:effectiveInput},
					{sets:['B'],size:entry.DEGcount},{sets:['A','B'],size:overlapSize}];
				}
				if(!('sets' in entry)) $scope.allHaveSets = false;
			};
		});
		try {
			// for front-end downloading table using FileSaver.js
    		$scope.isFileSaverSupported = !!new Blob;
		} catch (e) {
			$scope.isFileSaverSupported = false;
		}
		$scope.pubchemURL = "http://pubchem.ncbi.nlm.nih.gov/summary/summary.cgi?cid=";
		$scope.drugbankURL = "http://www.drugbank.ca/drugs/";
		$scope.lifeURL = "http://life.ccs.miami.edu/life/summary?mode=SmallMolecule&source=BROAD&input="
		$scope.helpURL = baseURL+'help/';
		$scope.overlap = {};
		var tag = util.getTag($scope.input.meta);
		$scope.tag = tag?tag:{value:"No tag"};
		$scope.direction = $scope.input.config.aggravate?"mimic":"reverse";
		if($scope.input.config.searchMethod=="geneSet"){
			$scope.overlap.templateUrl = "partials/overlap_geneSet.html";
			var overlapKeys = Object.keys($scope.entries[0].overlap).sort();
			$scope.overlap.key1 = overlapKeys[1];
			$scope.overlap.key2 = overlapKeys[0];
			$scope.overlap.title = "overlap: input/signature";
			$scope._keyMap = function(key){
				return {input:key.slice(0,2),sig:key.slice(3,5)}
			};
			$scope.buildOverlap = function(key,entry){
				var overlapStr = entry.overlap[key].join('\n');
				var keyMap = $scope._keyMap(key)
				var inputDirection = keyMap.input;
				var sigDirection = keyMap.sig;
				return overlapStr?overlapStr:("The input "+inputDirection+ " genes has no overlap with the "+sigDirection+" genes in signature.");
			}
			$scope.enrichr = function(key,entry){
				var enrichrInput = {popup:true};
				enrichrInput.list = entry.overlap[key].join('\n');
				var values = {};
				values.inputDirection = key.slice(0,2);
				values.sigDirection = key.slice(3,5);
				values.pertName = entry["pert_desc"]=="-666" || entry["pert_desc"].length > 46 ?entry["pert_id"]:entry["pert_desc"];
				values.tag = $scope.tag?$scope.tag.value:"input";
				var template = "overlap between {{inputDirection}} genes of {{tag}} and {{sigDirection}} genes of {{pertName}}"
				enrichrInput.description = S(template).template(values).s;
				util.enrich(enrichrInput);
			}
		}else{
			$scope.getDegree = function(cosDist){
				return Math.round(Math.acos(1-cosDist)*180/Math.PI*10)/10;
			}
			$scope.overlap.templateUrl = "partials/overlap_CD.html";
			var overlapKeys = Object.keys($scope.entries[0].overlap).sort();
			$scope.overlap.key1 = overlapKeys[1];
			$scope.overlap.key2 = overlapKeys[0];
			$scope._aggravate = $scope.input.config.aggravate;
			$scope._sigKeyMap = {}; // map input key to signature key
			$scope._sigKeyMap[$scope.overlap.key1] = $scope._aggravate?$scope.overlap.key1:$scope.overlap.key2;
			$scope._sigKeyMap[$scope.overlap.key2] = $scope._aggravate?$scope.overlap.key2:$scope.overlap.key1;
			$scope.overlap.title = "overlap: (gene symbol) (input value) (signature value)"
			$scope.buildOverlap = function(key,entry){
				var aggravate = $scope.input.config.aggravate;
				var cdVec = entry.overlap[key]
				if(!("_dynamic" in entry)){
					// store gene list
					entry._dynamic = {};
				}
				var overlapArr = _.zip($scope.uniqInput[key].genes,
				$scope.uniqInput[key].vals, cdVec);
				var filter = aggravate?function(item){return item[1]*item[2]>0}:
				function(item){return item[1]*item[2]<0};
				var overlapStrArr = [];
				entry._dynamic[key] = [];
				overlapArr.forEach(function(item){
					overlapStrArr.push(item.join('\t'));
					if(filter(item)){
						entry._dynamic[key].push(item[0]);
					}
				});
				var overlapStr = overlapStrArr.join('\n');
				return overlapStr?overlapStr:("The input "+key.slice(0,2)+ " genes has no overlap with the genes in signature.");
			}
			$scope.enrichr = function(key,entry){
				var enrichrInput = {popup:true};
				enrichrInput.list = entry._dynamic[key].join('\n');
				var values = {};
				values.inputDirection = key;
				values.sigDirection = $scope._sigKeyMap[key];
				values.pertName = entry["pert_desc"]=="-666" || entry["pert_desc"].length > 46 ?entry["pert_id"]:entry["pert_desc"];
				values.tag = $scope.tag?$scope.tag.value:"input";
				var template = "overlap between {{inputDirection}} genes of {{tag}} and {{sigDirection}} genes of {{pertName}}";
				enrichrInput.description = S(template).template(values).s;
				util.enrich(enrichrInput);
			}
		}
	}


	$scope.downloadMeta = function(sig_id){
			var url = baseURL+"meta?sig_id="+sig_id;
			window.location = url;
	}


	$scope.share = function(){
		var modalInstance = $modal.open({
      		templateUrl: baseURL+'share.html',
      		controller: 'ModalInstanceCtrl',
      		resolve: {
        		shareURL: function () {
          		return location.href;
        		}
      		}
    		});
	}

	$scope.saveFile = function(){
		var header = ['Rank','Score','Perturbation','Perturbation LIFE URL',
		'Perturbation PubChem URL', 'Perturbation DrugBank URL','Cell-line',
		'Dose','Time','Signature URL'].join(',');
		var content = $scope.entries.map(function(entry){
			return [entry.rank,entry["score"].toFixed(4),
			entry["pert_desc"]=="-666" || entry["pert_desc"].length > 46 ?entry["pert_id"]:entry["pert_desc"],
			$scope.lifeURL+entry.pert_id, 
			entry.pubchem_id?($scope.pubchemURL+entry.pubchem_id):'None',
			entry.drugbank_id?($scope.drugbankURL+entry.drugbank_id):'None', 
			entry.cell_id,
			entry["pert_dose"]+entry["pert_dose_unit"],
			entry["pert_time"]+entry["pert_time_unit"],
			baseURL+"meta?sig_id="+entry.sig_id].join(',');
		}).join('\n');

		var blob = new Blob([header+'\n'+content], {type: "text/plain;charset=utf-8"});
		saveAs(blob, 'table.'+shareID+".csv");
	}

	$scope.reanalyze = function(){
		$location.path('/index/'+shareID);
	}

	$scope.goToStructure = function(){
		$location.path('/enrichedSubtructures/'+shareID);
	}

	$scope.$on('$viewContentLoaded',function(event){
		$timeout(function(){
			// hack to fix the overlap popover wrong position at first click bug in Firefox.
			$('[popover-placement="left"]').first().click();
			$('[popover-placement="left"]').first().click();
		},0)
	});

}]);

indexControllers.controller('ModalInstanceCtrl', 
	['$scope', '$modalInstance', 'shareURL', 
	function($scope, $modalInstance, shareURL) {
  
 $scope.shouldBeOpened = true;
 $scope.shareURL = shareURL;
 $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };
}]);


indexControllers.controller('testCtrl',function($scope,$rootScope){
	$scope.trigger = function(){
		$rootScope.$broadcast('stHighlight',{
			sig_id:"CPC005_HT29_6H:BRD-K31342827:10.0"
		});
	}	
})