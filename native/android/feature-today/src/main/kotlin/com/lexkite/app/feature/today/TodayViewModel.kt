package com.lexkite.app.feature.today

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.lexkite.app.core.data.LexStore
import com.lexkite.app.core.today.TodayModel
import com.lexkite.app.core.today.TodaySummary
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** Today (P02): recomputed from the local store after every write (offline-first; sync merges show up immediately). */
class TodayViewModel(private val store: LexStore, private val clock: () -> Long = System::currentTimeMillis) : ViewModel() {
    private val _state = MutableStateFlow<TodaySummary?>(null)
    val state: StateFlow<TodaySummary?> = _state

    init {
        viewModelScope.launch {
            store.version.collectLatest {
                _state.value = withContext(Dispatchers.Default) { TodayModel.compute(store.doc(), store.get(LexStore.K_MISTAKES), clock()) }
            }
        }
    }

    class Factory(private val store: LexStore) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T = TodayViewModel(store) as T
    }
}
